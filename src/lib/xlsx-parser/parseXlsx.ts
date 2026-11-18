// @ts-expect-error no typings for this file
import XLSX from "xlsx/xlsx.js";
import {
  CashEvent,
  ExchangeRates,
  PortfolioCurrency,
  PortfolioData,
  PortfolioEvents,
  PortfolioEventsResponse,
  type PortfolioEvent,
  StockMarketData,
  XlsxColumn,
} from "../types";
import { AbstractRedisClient } from "../redis";
import {
  CASH_EVENT,
  CASH_DEPOSIT,
  CASH_OPERATION_HISTORY,
  CASH_TRANSFER,
  CASH_WITHDRAWAL,
  CLOSED_POSITION_HISTORY,
  STOCK_CLOSE_EVENT,
  STOCK_OPEN_EVENT,
  STOCK_OPEN_POSITION,
} from "@/lib/xlsx-parser/consts";
import {
  convertToCurrency,
  getClosedPositionRowIds,
  parseStockVolumeAndPriceFromComment,
  XlsxHelper,
} from "@/lib/xlsx-parser/utils";
import { mergePortfolioEvents } from "@/lib/xlsx-parser/mergePortfolioEvents";
import { formatDate } from "@/lib/utils";
import { UserPortfolioRepository } from "@/database/UserPortfolioRepository";
import { User } from "@clerk/nextjs/server";
import { BenchmarkIndex } from "@/lib/benchmarks";
import { applyReciprocalSplits, getStockMarketData } from "@/lib/market-data/marketData";
import { getRatesForDate } from "@/lib/exchange-rates/rateWindows";
import iocContainer from "@/iocContainer";

if (!process.env.REDIS_URL) {
  throw new Error(
    "Please set the REDIS_URL environment variable in the .env file. Example: REDIS_URL=redis://localhost:6379",
  );
}

const isRowStockSell = (row: Record<string, string | number>) =>
  ["Stock sell", "Commission"].includes(String(row[XlsxColumn.TYPE]));
const isRowStockBuy = (row: Record<string, string | number>) => String(row[XlsxColumn.TYPE]) === "Stock purchase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCashEvents(workbook: any): CashEvent[] {
  const cashDataAsObjectArray = XlsxHelper.parseSheetToJson(workbook, CASH_OPERATION_HISTORY);
  if (cashDataAsObjectArray.length === 0) {
    return [];
  }

  return cashDataAsObjectArray
    .filter((row) => row[XlsxColumn.TIME])
    .map((row) => {
      const { volume, price } = parseStockVolumeAndPriceFromComment(String(row[XlsxColumn.COMMENT] || ""));

      return {
        id: String(row[XlsxColumn.CASH_OPERATION_ID] || ""),
        date: XlsxHelper.parseXLSXDate(row[XlsxColumn.TIME]).toISOString(),
        cashChange: Number(row[XlsxColumn.AMOUNT] || 0),
        type: CASH_EVENT,
        stocksVolumeChange: isRowStockSell(row) ? -volume : isRowStockBuy(row) ? volume : 0,
        stockSymbol: String(row[XlsxColumn.TICKER]) || null,
        openPrice: price,
        positionId: String(row[XlsxColumn.POSITION_ID] ?? "") || null,
        cashWithdrawalOrDeposit: [CASH_DEPOSIT as string, CASH_WITHDRAWAL, CASH_TRANSFER].includes(
          String(row[XlsxColumn.TYPE]),
        )
          ? Number(row[XlsxColumn.AMOUNT])
          : null,
      };
    });
}

/**
 * Rows of the "Closed Positions" sheet, each with an id that's unique within the report. A single position
 * (Position ID) is often split into several rows - e.g. its whole and fractional shares, or partial closes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedPositionRows(workbook: any): { id: string; row: Record<string, string | number> }[] {
  const rows = XlsxHelper.parseSheetToJson(workbook, CLOSED_POSITION_HISTORY).filter(
    (row) => row[XlsxColumn.CLOSE_TIME],
  );
  const ids = getClosedPositionRowIds(
    rows.map((row) => ({
      positionId: row[XlsxColumn.POSITION_ID],
      closeTime: row[XlsxColumn.CLOSE_TIME],
      volume: row[XlsxColumn.VOLUME],
    })),
  );
  return rows.map((row, index) => ({ id: ids[index], row }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedStocksOpenEvents(workbook: any): PortfolioEvent[] {
  return getClosedPositionRows(workbook)
    .filter(({ row }) => row[XlsxColumn.OPEN_TIME])
    .map(({ id, row }) => {
      return {
        id,
        date: XlsxHelper.parseXLSXDate(row[XlsxColumn.OPEN_TIME]).toISOString(),
        stocksVolumeChange: Number(row[XlsxColumn.VOLUME] || 0),
        type: STOCK_OPEN_EVENT,
        stockSymbol: String(row[XlsxColumn.TICKER]) || null,
        openPrice: Number(row[XlsxColumn.OPEN_PRICE] || 0),
      };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedStocksCloseEvents(workbook: any): PortfolioEvent[] {
  return getClosedPositionRows(workbook).map(({ id, row }) => ({
    id,
    date: XlsxHelper.parseXLSXDate(row[XlsxColumn.CLOSE_TIME]).toISOString(),
    stocksVolumeChange: Number(row[XlsxColumn.VOLUME] || 0),
    type: STOCK_CLOSE_EVENT,
    stockSymbol: String(row[XlsxColumn.TICKER]) || null,
    profitOrLoss: Number(row[XlsxColumn.GROSS_PL] || 0),
    closePrice: Number(row[XlsxColumn.CLOSE_PRICE] || 0),
  }));
}

/**
 * Parses the sheet and tracks the value of cash and stocks over time.
 * Returns an array of objects { date, cash, stocks } sorted ascending by date.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCashAndStocksEvents(workbook: any): PortfolioEvents {
  // Collect all cash operations
  const cashEvents = getCashEvents(workbook);
  // Collect all stock open positions
  // const openPositions = getStockOpenPositions(workbook);
  // Collect all open events from closed positions (stocks)
  const closedStocksOpenEvents = getClosedStocksOpenEvents(workbook);
  // Collect all stock close positions
  const closedStocksCloseEvents = getClosedStocksCloseEvents(workbook);

  return {
    cashEvents,
    closedStocksOpenEvents,
    closedStocksCloseEvents,
  };
}

export function getStockTickersFromEvents(events: PortfolioEvent[]): Set<string> {
  return events.reduce((acc, next) => {
    if (
      [STOCK_OPEN_EVENT, STOCK_OPEN_POSITION].includes(
        next.type as typeof STOCK_OPEN_EVENT | typeof STOCK_OPEN_POSITION,
      )
    ) {
      acc.add(
        (next as PortfolioEvent & { type: typeof STOCK_OPEN_EVENT | typeof STOCK_OPEN_POSITION }).stockSymbol as string,
      );
    }
    // Also collect symbols from cash buy operations (covers currently open positions)
    if (next.type === CASH_EVENT && next.stockSymbol && next.stocksVolumeChange && next.stocksVolumeChange > 0) {
      acc.add(next.stockSymbol);
    }

    return acc;
  }, new Set<string>());
}

const parsePortfolioEvents = (xlsxArrayBuffer: ArrayBuffer): PortfolioData["portfolioEvents"] => {
  console.log("Parsing portfolio from xlsx file");
  const workbook = XLSX.read(new Uint8Array(xlsxArrayBuffer), { type: "array" });
  return getCashAndStocksEvents(workbook);
};

const getPortfolioEvents = async (
  user: User,
  selectedPortfolio: PortfolioCurrency,
): Promise<PortfolioEvents | null> => {
  return await UserPortfolioRepository.getPortfolioFromDB(user, selectedPortfolio);
};

/**
 * Converts the raw (as-exported by XTB, instrument-currency, as-traded) event prices into the portfolio currency
 * and adjusts them for splits, so they're comparable with split-adjusted quotes. Volumes are left as traded:
 * the portfolio timeline multiplies them by unadjusted prices; the asset views adjust them with `getSplitFactor`.
 */
const adjustEventPrices = (
  events: PortfolioData["portfolioEvents"],
  exchangeRates: ExchangeRates,
  stockMarketData: StockMarketData,
  toCurrency: PortfolioCurrency,
) => {
  const { cashEvents, closedStocksOpenEvents, closedStocksCloseEvents } = events;

  for (const event of [...cashEvents, ...closedStocksOpenEvents, ...closedStocksCloseEvents]) {
    if (!event.stockSymbol) continue;

    const stockSymbol = event.stockSymbol;
    const marketData = stockMarketData[stockSymbol];

    if (!marketData) continue;

    const date = formatDate(new Date(event.date));
    if (event.type === STOCK_OPEN_EVENT || event.type === CASH_EVENT) {
      if (!event.openPrice) continue;

      event.openPrice =
        convertToCurrency(event.openPrice, getRatesForDate(exchangeRates, date), marketData.currency, toCurrency) ??
        event.openPrice;

      event.openPrice = applyReciprocalSplits({ open: event.openPrice }, marketData.splits, new Date(event.date)).open;
    }

    if (event.type === STOCK_CLOSE_EVENT) {
      event.closePrice =
        convertToCurrency(event.closePrice, getRatesForDate(exchangeRates, date), marketData.currency, toCurrency) ??
        event.closePrice;

      event.closePrice = applyReciprocalSplits(
        { close: event.closePrice },
        marketData.splits,
        new Date(event.date),
      ).close;
    }
  }
};

export async function uploadPortfolioData(
  user: User,
  selectedPortfolio: PortfolioCurrency,
  xlsxArrayBuffer: ArrayBuffer,
): Promise<void> {
  await iocContainer.get(AbstractRedisClient).initialize();
  const events = parsePortfolioEvents(xlsxArrayBuffer);
  const existingEvents = await getPortfolioEvents(user, selectedPortfolio);
  let finalEvents = events;

  if (existingEvents) {
    finalEvents = mergePortfolioEvents(existingEvents, events);
  }

  await UserPortfolioRepository.savePortfolioToDB(finalEvents, user, selectedPortfolio);
}

/**
 * Prepares the user's events for the client: prices converted to the portfolio currency and split-adjusted.
 * Market data itself isn't included - the client fetches it from `/api/market-data` in a separate (bulk) request,
 * since it doesn't depend on the user.
 */
export async function buildPortfolioEventsResponse(
  eventsInput: PortfolioEvents,
  portfolioCurrency: PortfolioCurrency,
): Promise<PortfolioEventsResponse | null> {
  const events = structuredClone(eventsInput) as PortfolioEvents;

  const { cashEvents, closedStocksOpenEvents, closedStocksCloseEvents } = events;
  const allEvents = [...cashEvents, ...closedStocksOpenEvents, ...closedStocksCloseEvents];

  if (!allEvents.length) return null;

  const stockTickers = getStockTickersFromEvents(allEvents);
  Object.values(BenchmarkIndex).forEach((value) => {
    stockTickers.add(value);
  });

  // Also warms the market data and exchange rates caches before the client asks for each ticker
  const { stockMarketData, exchangeRates } = await getStockMarketData(stockTickers, portfolioCurrency);

  adjustEventPrices(events, exchangeRates, stockMarketData, portfolioCurrency);

  return {
    portfolioEvents: events,
    tickers: Object.keys(stockMarketData).toSorted(),
  };
}

export async function getPortfolioEventsForUser(
  user: User,
  selectedPortfolio: PortfolioCurrency,
): Promise<PortfolioEventsResponse | null> {
  const userEvents = await getPortfolioEvents(user, selectedPortfolio);
  if (userEvents == null) {
    return null;
  }
  return buildPortfolioEventsResponse(userEvents, selectedPortfolio);
}
