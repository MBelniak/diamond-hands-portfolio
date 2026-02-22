// @ts-expect-error no typings for this file
import XLSX from "xlsx/xlsx.js";
import { isAfter, isSameDay } from "date-fns";
import { isBefore } from "date-fns/isBefore";
import {
  CashEvent,
  ExchangeRates,
  PortfolioCurrency,
  PortfolioData,
  type PortfolioEvent,
  type Split,
  StockMarketData,
  TickerMarketData,
  TickerQuote,
  XlsxColumn,
} from "../types";
import { createClient, RedisClientType } from "redis";
import { getStockPricesRedisKey as getTickerMarketDataRedisKey, REDIS_EXPIRE_IN_DAY } from "../redis";
import {
  CASH,
  CASH_DEPOSIT,
  CASH_OPERATION_HISTORY,
  CASH_TRANSFER,
  CASH_WITHDRAWAL,
  CLOSED_POSITION_HISTORY,
  OPEN_POSITION,
  STOCK_CLOSE_EVENT,
  STOCK_OPEN_EVENT,
  STOCK_OPEN_POSITION,
} from "@/lib/xlsx-parser/consts";
import { convertToCurrency, getPricesFromTickerQuote, XlsxHelper } from "@/lib/xlsx-parser/utils";
import { formatDate } from "@/lib/utils";
import { UserPortfolioRepository } from "@/database/UserPortfolioRepository";
import { User } from "@clerk/nextjs/server";
import { BenchmarkIndex } from "@/lib/benchmarks";
import { uniqBy } from "lodash-es";
import { YahooAPIHelper } from "@/lib/yahoo-api/YahooAPIHelper";
import { ExchangeRatesHelper } from "@/lib/exchange-rates/ExchangeRatesHelper";

if (!process.env.REDIS_URL) {
  throw new Error(
    "Please set the REDIS_URL environment variable in the .env file. Example: REDIS_URL=redis://localhost:6379",
  );
}

const redis = await createClient({ url: process.env.REDIS_URL }).connect();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCashEvents(workbook: any): CashEvent[] {
  const cashDataAsObjectArray = XlsxHelper.parseSheetToJson(workbook, CASH_OPERATION_HISTORY);
  if (cashDataAsObjectArray.length === 0) {
    return [];
  }

  return cashDataAsObjectArray
    .filter((row) => row[XlsxColumn.TIME])
    .map((row) => ({
      id: String(row[XlsxColumn.CASH_OPERATION_ID] || ""),
      date: XlsxHelper.parseXLSXDate(row[XlsxColumn.TIME]).toISOString(),
      cashChange: Number(row[XlsxColumn.AMOUNT] || 0),
      type: CASH,
      cashWithdrawalOrDeposit: [CASH_DEPOSIT as string, CASH_WITHDRAWAL, CASH_TRANSFER].includes(
        String(row[XlsxColumn.TYPE]),
      )
        ? Number(row[XlsxColumn.AMOUNT])
        : null,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStockOpenPositions(workbook: any): PortfolioEvent[] {
  const openData = XlsxHelper.parseSheetToJson(workbook, OPEN_POSITION);
  if (openData.length === 0) {
    return [];
  }

  return openData
    .filter((row) => row[XlsxColumn.OPEN_TIME])
    .map((row) => ({
      id: String(row[XlsxColumn.POSITION_ID] ?? ""),
      date: XlsxHelper.parseXLSXDate(row[XlsxColumn.OPEN_TIME]).toISOString(),
      stocksVolumeChange: Number(row[XlsxColumn.VOLUME] || 0),
      type: STOCK_OPEN_POSITION,
      stockSymbol: String(row[XlsxColumn.SYMBOL] || null),
      profitOrLoss: Number(row[XlsxColumn.GROSS_PL] || 0),
      openPrice: Number(row[XlsxColumn.OPEN_PRICE] || 0),
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedStocksOpenEvents(workbook: any): PortfolioEvent[] {
  const closedData = XlsxHelper.parseSheetToJson(workbook, CLOSED_POSITION_HISTORY);
  if (closedData.length === 0) {
    return [];
  }

  return closedData
    .filter((row) => row[XlsxColumn.OPEN_TIME])
    .map((row) => ({
      id: String(row[XlsxColumn.POSITION_ID] ?? ""),
      date: XlsxHelper.parseXLSXDate(row[XlsxColumn.OPEN_TIME]).toISOString(),
      stocksVolumeChange: Number(row[XlsxColumn.VOLUME] || 0),
      type: STOCK_OPEN_EVENT,
      stockSymbol: String(row[XlsxColumn.SYMBOL]) || null,
      openPrice: Number(row[XlsxColumn.OPEN_PRICE] || 0),
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedStocksCloseEvents(workbook: any): PortfolioEvent[] {
  const closedData = XlsxHelper.parseSheetToJson(workbook, CLOSED_POSITION_HISTORY);
  if (closedData.length === 0) {
    return [];
  }

  return closedData
    .filter((row) => row[XlsxColumn.CLOSE_TIME])
    .map((row) => ({
      id: String(row[XlsxColumn.POSITION_ID] ?? ""),
      date: XlsxHelper.parseXLSXDate(row[XlsxColumn.CLOSE_TIME]).toISOString(),
      stocksVolumeChange: Number(row[XlsxColumn.VOLUME] || 0),
      type: STOCK_CLOSE_EVENT,
      stockSymbol: String(row[XlsxColumn.SYMBOL]) || null,
      profitOrLoss: Number(row[XlsxColumn.GROSS_PL] || 0),
      closePrice: Number(row[XlsxColumn.CLOSE_PRICE] || 0),
    }));
}

/**
 * Parses the sheet and tracks the value of cash and stocks over time.
 * Returns an array of objects { date, cash, stocks } sorted ascending by date.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCashAndStocksEvents(workbook: any): PortfolioData["portfolioEvents"] {
  // Collect all cash operations
  const cashEvents = getCashEvents(workbook);
  // Collect all stock open positions
  const openPositions = getStockOpenPositions(workbook);
  // Collect all open events from closed positions (stocks)
  const closedStocksOpenEvents = getClosedStocksOpenEvents(workbook);
  // Collect all stock close positions
  const closedStocksCloseEvents = getClosedStocksCloseEvents(workbook);

  return {
    cashEvents,
    openPositions,
    closedStocksOpenEvents,
    closedStocksCloseEvents,
  };
}

function parseSplits(splits?: Record<string, { date: number; numerator: number; denominator: number }>): Split[] {
  if (!splits) {
    return [];
  }
  return Object.values(splits).map((split) => ({
    effective_date: new Date(split.date * 1000).toISOString().slice(0, 10),
    split_factor: split.numerator / split.denominator,
  }));
}

const isSplitApplicable = (split: Split, date: Date): boolean =>
  isBefore(date, new Date(split.effective_date)) || isSameDay(date, new Date(split.effective_date));

const applySplits = <PTickerQuote extends Partial<TickerQuote>>(
  tickerQuote: PTickerQuote,
  splits: Split[],
  date: Date,
): PTickerQuote => {
  const result = { ...tickerQuote };
  splits
    ?.filter((split: Split) => isSplitApplicable(split, date))
    .forEach((split) => {
      if (split.split_factor) {
        Object.keys(result).forEach((key) => {
          (result[key as keyof typeof result] as number) *= split.split_factor;
        });
      }
    });

  return result;
};

const applyReciprocalSplits = <PTickerQuote extends Partial<TickerQuote>>(
  tickerQuote: PTickerQuote,
  splits: Split[],
  date: Date,
): PTickerQuote => {
  return applySplits(
    tickerQuote,
    splits.map((split) => ({ ...split, split_factor: 1 / (split.split_factor || 1) })),
    date,
  );
};

function populatePriceMapForDate(date: Date, tickerQuote: TickerQuote, splits: Split[], prices: TickerMarketData) {
  const dateKey = formatDate(date);
  // yahoo API already returns converted values
  prices.splitAdjustedTickerQuoteByDateString[dateKey] = tickerQuote;
  prices.tickerQuoteByDateString[dateKey] = {
    ...applySplits(getPricesFromTickerQuote(tickerQuote), splits, date),
    volume: tickerQuote.volume,
  };
}

/**
 * Fetches closing prices for a given stock symbol in the specified date range.
 * Now supports conversion to USD using daily exchange rates.
 */
async function fetchStockClosePriceRange(
  symbol: string,
  startDate: Date,
  endDate: Date,
): Promise<TickerMarketData | null> {
  const data = await YahooAPIHelper.fetchHistoricalTickerMarketData(symbol, startDate, endDate);
  if (!data) {
    return null;
  }
  const result = data.chart?.result;
  if (!result || result.length === 0) {
    return null;
  }

  const quote = result[0].indicators?.quote?.[0];
  if (!quote) {
    return null;
  }

  const timestamp = result[0].timestamp;

  if (!timestamp) {
    return null;
  }

  const currency = result[0].meta?.currency ?? "USD";
  const splits = parseSplits(result[0].events?.splits);
  const regularMarketPrice = result[0].meta?.regularMarketPrice;
  const tradingPeriodRegularEndTimestamp = result[0].meta?.currentTradingPeriod?.regular?.end;
  const tradingPeriodRegularEndDate = tradingPeriodRegularEndTimestamp
    ? new Date(tradingPeriodRegularEndTimestamp * 1000)
    : null;
  const longName = result[0].meta?.longName ?? symbol;
  const instrumentType = result[0].meta?.instrumentType;

  const pricesRecord: TickerMarketData = {
    currency,
    tickerQuoteByDateString: {},
    splitAdjustedTickerQuoteByDateString: {},
    regularMarketPrice: result[0].meta?.regularMarketPrice ?? 0,
    longName,
    instrumentType,
    splits,
  };

  for (let i = 0; i < timestamp.length; i++) {
    const date = new Date(timestamp[i] * 1000);

    if (date < startDate || date > endDate) {
      continue;
    }

    // Push missing data points forward
    Object.keys(quote).forEach((key) => {
      const _key = key as keyof typeof quote;
      if (quote[_key].length === i) {
        quote[_key].push(quote[_key][i - 1]);
      }
      if (quote[_key][i] === null || quote[_key][i] === undefined) {
        quote[_key][i] = quote[_key][i - 1];
      }
    });

    const tickerQuote: TickerQuote = {
      open: quote.open[i],
      close: quote.close[i],
      high: quote.high[i],
      low: quote.low[i],
      volume: quote.volume[i],
    };

    if (
      tradingPeriodRegularEndDate &&
      (isSameDay(date, tradingPeriodRegularEndDate) || isAfter(date, tradingPeriodRegularEndDate)) &&
      isBefore(new Date(), tradingPeriodRegularEndDate) &&
      regularMarketPrice
    ) {
      // If market is still open and we ask for today's or future date, return current price
      populatePriceMapForDate(date, tickerQuote, splits, pricesRecord);
    } else {
      populatePriceMapForDate(date, tickerQuote, splits, pricesRecord);
    }
  }

  return pricesRecord;
}

// Fetches stock prices
async function getTickerMarketData(symbol: string, startDate: Date, endDate: Date): Promise<TickerMarketData> {
  const tickerMarketData = await fetchStockClosePriceRange(symbol, startDate, endDate);

  if (tickerMarketData) {
    await redis.set(
      getTickerMarketDataRedisKey(symbol, startDate, endDate),
      JSON.stringify(tickerMarketData),
      REDIS_EXPIRE_IN_DAY,
    );
    return tickerMarketData;
  }

  return {
    currency: "USD",
    tickerQuoteByDateString: {},
    splitAdjustedTickerQuoteByDateString: {},
    regularMarketPrice: 0,
    longName: symbol,
    splits: [],
  };
}

const getRawMarketData = async (stocks: Set<string>, startDate: Date, endDate: Date) => {
  return (
    await Promise.all(
      Array.from(stocks).map(async (symbol) => {
        let marketData: TickerMarketData;
        if (await redis.exists(getTickerMarketDataRedisKey(symbol, startDate, endDate))) {
          marketData = JSON.parse((await redis.get(getTickerMarketDataRedisKey(symbol, startDate, endDate))) as string);
        } else {
          marketData = await getTickerMarketData(symbol, startDate, endDate);
        }
        return { symbol, marketData };
      }),
    )
  ).filter(({ marketData }) => !!marketData);
};

/**
 * Returns prices in stock's original currency
 * @param stocks
 * @param startDate
 */
async function getStockMarketData(stocks: Set<string>, startDate: Date): Promise<StockMarketData> {
  const endDate = new Date();
  const stockMarketData: StockMarketData = {};

  const rawMarketData = await getRawMarketData(stocks, startDate, endDate);

  rawMarketData.forEach(({ symbol, marketData }) => {
    stockMarketData[symbol] = marketData;
  });

  return stockMarketData;
}

function getStockSymbolsFromEvents(events: PortfolioEvent[]): Set<string> {
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

    return acc;
  }, new Set<string>());
}

const parsePortfolioEvents = (xlsxArrayBuffer: ArrayBuffer): PortfolioData["portfolioEvents"] => {
  console.log("Parsing portfolio from xlsx file");
  const workbook = XLSX.read(xlsxArrayBuffer);
  return getCashAndStocksEvents(workbook);
};

const getPortfolioEvents = async (
  user: User,
  selectedPortfolio: PortfolioCurrency,
): Promise<PortfolioData["portfolioEvents"] | null> => {
  return await UserPortfolioRepository.getPortfolioFromDB(user, selectedPortfolio);
};

const convertMarketDataToCurrency = (
  stockMarketData: StockMarketData,
  exchangeRates: ExchangeRates,
  portfolioCurrency: PortfolioCurrency,
) => {
  for (const [symbol, priceRecord] of Object.entries(stockMarketData)) {
    stockMarketData[symbol].regularMarketPrice = convertToCurrency(
      priceRecord.regularMarketPrice,
      exchangeRates[formatDate(new Date())] || {},
      priceRecord.currency,
      portfolioCurrency,
    )!;
    for (const [date, tickerQuote] of Object.entries(priceRecord.tickerQuoteByDateString)) {
      Object.keys(getPricesFromTickerQuote(tickerQuote)).forEach((key) => {
        const _key = key as keyof TickerQuote;
        stockMarketData[symbol].tickerQuoteByDateString[date][_key] = convertToCurrency(
          tickerQuote[_key],
          exchangeRates[date] || {},
          priceRecord.currency,
          portfolioCurrency,
        )!;
      });
    }
    for (const [date, tickerQuote] of Object.entries(priceRecord.splitAdjustedTickerQuoteByDateString)) {
      Object.keys(getPricesFromTickerQuote(tickerQuote)).forEach((key) => {
        const _key = key as keyof TickerQuote;
        stockMarketData[symbol].splitAdjustedTickerQuoteByDateString[date][_key] = convertToCurrency(
          tickerQuote[_key],
          exchangeRates[date] || {},
          priceRecord.currency,
          portfolioCurrency,
        )!;
      });
    }
  }
};

const adjustEventPrices = (
  events: PortfolioData["portfolioEvents"],
  exchangeRates: ExchangeRates,
  stockMarketData: StockMarketData,
  toCurrency: PortfolioCurrency,
) => {
  const { openPositions, closedStocksOpenEvents, closedStocksCloseEvents } = events;
  [...openPositions, ...closedStocksOpenEvents, ...closedStocksCloseEvents].forEach((event) => {
    const date = formatDate(new Date(event.date));
    if (event.type === STOCK_OPEN_POSITION || event.type === STOCK_OPEN_EVENT) {
      const stockSymbol = event.stockSymbol!;

      event.openPrice =
        convertToCurrency(
          event.openPrice,
          exchangeRates[date] || {},
          stockMarketData[stockSymbol].currency,
          toCurrency,
        ) ?? event.openPrice;

      event.openPrice = applyReciprocalSplits(
        { open: event.openPrice },
        stockMarketData[stockSymbol].splits,
        new Date(event.date),
      ).open;
    }

    if (event.type === STOCK_CLOSE_EVENT) {
      const stockSymbol = event.stockSymbol!;
      event.closePrice =
        convertToCurrency(
          event.closePrice,
          exchangeRates[date] || {},
          stockMarketData[stockSymbol].currency,
          toCurrency,
        ) ?? event.closePrice;

      event.closePrice = applyReciprocalSplits(
        { close: event.closePrice },
        stockMarketData[stockSymbol].splits,
        new Date(event.date),
      ).close;
    }
  });
};

const filterById =
  <T extends { id: string }>(events: T[]) =>
  (event: PortfolioEvent) =>
    !events.some((e) => e.id === event.id);

const filterOutClosedPositions =
  (closedPositions: PortfolioData["portfolioEvents"]["closedStocksCloseEvents"]) => (event: PortfolioEvent) =>
    !closedPositions.some((closedEvent) => closedEvent.id === event.id);

const mergeEvents = (
  existingEvents: PortfolioData["portfolioEvents"],
  events: PortfolioData["portfolioEvents"],
): PortfolioData["portfolioEvents"] => {
  return {
    cashEvents: uniqBy(
      events.cashEvents.concat(...existingEvents.cashEvents.filter(filterById(events.cashEvents))),
      "id",
    ),
    openPositions: uniqBy(
      events.openPositions.concat(
        ...existingEvents.openPositions
          .filter(filterById(events.openPositions))
          .filter(filterOutClosedPositions(events.closedStocksCloseEvents)),
      ),
      "id",
    ),
    closedStocksOpenEvents: uniqBy(
      events.closedStocksOpenEvents.concat(
        ...existingEvents.closedStocksOpenEvents.filter(filterById(events.closedStocksOpenEvents)),
      ),
      "id",
    ),
    closedStocksCloseEvents: uniqBy(
      events.closedStocksCloseEvents.concat(
        ...existingEvents.closedStocksCloseEvents.filter(filterById(events.closedStocksCloseEvents)),
      ),
      "id",
    ),
  };
};

export async function uploadPortfolioData(
  user: User,
  selectedPortfolio: PortfolioCurrency,
  xlsxArrayBuffer: ArrayBuffer,
): Promise<void> {
  const events = parsePortfolioEvents(xlsxArrayBuffer);
  const existingEvents = await getPortfolioEvents(user, selectedPortfolio);

  if (existingEvents) {
    const mergedEvents = mergeEvents(existingEvents, events);
    await UserPortfolioRepository.savePortfolioToDB(mergedEvents, user, selectedPortfolio);
  } else {
    await UserPortfolioRepository.savePortfolioToDB(events, user, selectedPortfolio);
  }
}

export async function getPortfolioData(
  user: User,
  portfolioCurrency: PortfolioCurrency,
): Promise<PortfolioData | null> {
  const events = await getPortfolioEvents(user, portfolioCurrency);
  if (!events) {
    return null;
  }

  const { cashEvents, openPositions, closedStocksOpenEvents, closedStocksCloseEvents } = events;

  const allEvents = [...cashEvents, ...openPositions, ...closedStocksOpenEvents, ...closedStocksCloseEvents].toSorted(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  if (!allEvents.length) return null;

  const stockSymbols = getStockSymbolsFromEvents(allEvents);
  Object.values(BenchmarkIndex).forEach((value) => {
    stockSymbols.add(value);
  });

  const startDate = new Date(2022, 0, 0);

  // Use new getStockMarketData function
  const stockMarketData = await getStockMarketData(stockSymbols, startDate);

  const currencies = new Set(
    Object.values(stockMarketData)
      .filter((priceData) => priceData)
      .map(({ currency }) => currency)
      .filter(Boolean),
  );

  const exchangeRatesHelper = new ExchangeRatesHelper(redis as RedisClientType);
  const exchangeRates = await exchangeRatesHelper
    .fetchExchangeRates(currencies, portfolioCurrency, startDate)
    .catch(() => ({}) as ExchangeRates);

  convertMarketDataToCurrency(stockMarketData, exchangeRates, portfolioCurrency);
  adjustEventPrices(events, exchangeRates, stockMarketData, portfolioCurrency);

  return {
    portfolioEvents: events,
    stockMarketData,
  };
}
