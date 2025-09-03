// @ts-expect-error no typings for this file
import XLSX from "xlsx/xlsx.js";
import { startOfDay } from "date-fns";
import { isSameDay } from "date-fns";
import fs from "fs-extra";
import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { isBefore } from "date-fns/isBefore";
import "dotenv/config";
import type { TimelineCheckpoint, PortfolioEvent, PortfolioValue, Split, Stock, AssetsHistoricalData } from "./types";
import { merge } from "lodash-es";

const STOCK_OPEN_POSITION = "stockOpenPosition" as const;
const STOCK_OPEN_EVENT = "stockOpenEvent" as const;
const STOCK_CLOSE_EVENT = "stockCloseEvent" as const;
const CASH = "cash" as const;
const CLOSED_POSITION_HISTORY = "CLOSED POSITION HISTORY";
const CASH_OPERATION_HISTORY = "CASH OPERATION HISTORY";
const OPEN_POSITION = "OPEN POSITION";

const SP500 = "^GSPC";
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || "demo"; // Use demo key if not set

// Helper function to get column indexes by headers
function getHeaderKeys<T extends readonly string[]>(
  headerRow: Record<string, string>,
  wantedKeys: T,
): Record<T[number], string> {
  const map = {} as Record<T[number], string>;
  for (const wantedKey of wantedKeys) {
    const foundKey = Object.keys(headerRow).find((key) => headerRow[key] === wantedKey);
    if (foundKey) {
      map[wantedKey as T[number]] = foundKey;
    }
  }
  return map;
}

function parseXLSXDate(dateStr: string | number): Date {
  const dateObjectParsed = XLSX.SSF.parse_date_code(dateStr as number);
  return new Date(
    dateObjectParsed.y,
    dateObjectParsed.m - 1,
    dateObjectParsed.d,
    dateObjectParsed.H || 0,
    dateObjectParsed.M || 0,
    dateObjectParsed.S || 0,
  );
}

function getCacheFilePath(symbol: string, startDate: Date, endDate: Date): string {
  return `./dist/priceCache-${symbol}-${format(startDate, "yyyy-MM-dd")}-${format(endDate, "yyyy-MM-dd")}.json`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCashEvents(workbook: any): PortfolioEvent[] {
  // Parse cash operation history
  const cashSheet = workbook.Sheets[CASH_OPERATION_HISTORY];
  const cashData: Record<string, string>[] = XLSX.utils.sheet_to_json(cashSheet);

  // CASH: find headers
  const cashHeaderIdx = cashData.findIndex((row) => Object.values(row).includes("Time"));
  const cashHeaders = cashData[cashHeaderIdx];
  const cashKeys = getHeaderKeys(cashHeaders, ["Time", "Amount", "Type"] as const);

  return cashData
    .slice(cashHeaderIdx + 1)
    .filter((row) => row[cashKeys["Time"]])
    .map((row) => ({
      date: parseXLSXDate(row[cashKeys["Time"]]),
      cashChange: parseFloat(row[cashKeys["Amount"]]) || 0,
      type: CASH,
      cashWithdrawalOrDeposit: ["deposit", "withdrawal", "transfer"].includes(row[cashKeys["Type"]])
        ? parseFloat(row[cashKeys["Amount"]]) || 0
        : null,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStockOpenPositions(workbook: any): PortfolioEvent[] {
  // Parse open positions history (stocks)
  const openSheet = workbook.Sheets[Object.keys(workbook.Sheets).find((key) => key.startsWith(OPEN_POSITION))!];
  const openData: Record<string, string>[] = XLSX.utils.sheet_to_json(openSheet);

  // STOCKS: find headers
  const openStocksHeaderIdx = openData.findIndex((row) => Object.values(row).includes("Open time"));
  const openStocksHeaders = openData[openStocksHeaderIdx];
  const openStocksKeys = getHeaderKeys(openStocksHeaders, ["Open time", "Volume", "Symbol", "Gross P/L"]);

  return openData
    .slice(openStocksHeaderIdx + 1)
    .filter((row) => row[openStocksKeys["Open time"]])
    .map((row) => {
      const volume = parseFloat(row[openStocksKeys["Volume"]]) || 0;
      return {
        date: parseXLSXDate(row[openStocksKeys["Open time"]]),
        stocksVolumeChange: volume,
        type: STOCK_OPEN_POSITION,
        stockSymbol: row[openStocksKeys["Symbol"]] || null,
        profitOrLoss: parseFloat(row[openStocksKeys["Gross P/L"]]) || 0,
      };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedOperationsData(workbook: any) {
  // Parse closed positions history (stocks)
  const closedSheet = workbook.Sheets[CLOSED_POSITION_HISTORY];
  const closedData: Record<string, string>[] = XLSX.utils.sheet_to_json(closedSheet);

  const closedStocksHeaderIdx = closedData.findIndex((row) => Object.values(row).includes("Close time"));
  const closedStocksHeaders = closedData[closedStocksHeaderIdx];
  const closedStocksKeys = getHeaderKeys(closedStocksHeaders, [
    "Close time",
    "Open time",
    "Volume",
    "Symbol",
    "Gross P/L",
  ]);

  return { closedData, closedStocksHeaderIdx, closedStocksKeys };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedStocksOpenEvents(workbook: any): PortfolioEvent[] {
  const { closedData, closedStocksHeaderIdx, closedStocksKeys } = getClosedOperationsData(workbook);

  return closedData
    .slice(closedStocksHeaderIdx + 1)
    .filter((row) => row[closedStocksKeys["Open time"]])
    .map((row) => {
      const volume = parseFloat(row[closedStocksKeys["Volume"]]) || 0;
      return {
        date: parseXLSXDate(row[closedStocksKeys["Open time"]]),
        stocksVolumeChange: volume,
        type: STOCK_OPEN_EVENT,
        stockSymbol: row[closedStocksKeys["Symbol"]] || null,
      };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedStocksCloseEvents(workbook: any): PortfolioEvent[] {
  const { closedData, closedStocksHeaderIdx, closedStocksKeys } = getClosedOperationsData(workbook);

  return closedData
    .slice(closedStocksHeaderIdx + 1)
    .filter((row) => row[closedStocksKeys["Close time"]])
    .map((row) => {
      const volume = parseFloat(row[closedStocksKeys["Volume"]]) || 0;
      return {
        date: parseXLSXDate(row[closedStocksKeys["Close time"]]),
        stocksVolumeChange: volume,
        type: STOCK_CLOSE_EVENT,
        stockSymbol: row[closedStocksKeys["Symbol"]] || null,
        profitOrLoss: parseFloat(row[closedStocksKeys["Gross P/L"]] || "0"),
      };
    });
}

function createEventTimeline(allEvents: PortfolioEvent[]): TimelineCheckpoint[] {
  // Store values over time
  let cash = 0;
  let balance = 0;
  let accProfitOrLoss = 0;
  const stocks = new Map<string, Stock>();
  const timeline = [];
  for (const event of allEvents) {
    if (event.type === CASH) {
      cash += event.cashChange;
      if (event.cashWithdrawalOrDeposit) {
        balance += event.cashWithdrawalOrDeposit; // Update balance on withdrawal or deposit
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      if ([STOCK_OPEN_EVENT, STOCK_OPEN_POSITION].includes(event.type) && event.stockSymbol) {
        if (!stocks.has(event.stockSymbol)) {
          stocks.set(event.stockSymbol, { volume: 0 });
        }
        stocks.set(event.stockSymbol, { volume: stocks.get(event.stockSymbol)!.volume + event.stocksVolumeChange });
      } else if (event.type === STOCK_CLOSE_EVENT && event.stockSymbol) {
        if (stocks.has(event.stockSymbol)) {
          const stockRecord = stocks.get(event.stockSymbol)!;
          stocks.set(event.stockSymbol, {
            volume: stockRecord.volume - event.stocksVolumeChange,
            takenProfitOrLoss: (stockRecord.takenProfitOrLoss ?? 0) + event.profitOrLoss,
          });
          if (stocks.get(event.stockSymbol)!.volume <= 1e-6) {
            stocks.get(event.stockSymbol)!.volume = 0;
          }
        }
        accProfitOrLoss += event.profitOrLoss || 0; // Add profit or loss from closed position
      }
    }
    timeline.push({
      date: event.date,
      cash,
      balance,
      stocks: Object.fromEntries(stocks), // Create a copy of the stocks map
      profitOrLoss: accProfitOrLoss,
      cashWithdrawalOrDeposit:
        event.type === CASH && event.cashWithdrawalOrDeposit ? event.cashWithdrawalOrDeposit : null,
    });
  }
  return timeline;
}

/**
 * Parses the sheet and tracks the value of cash and stocks over time.
 * Returns an array of objects { date, cash, stocks } sorted ascending by date.
 */
function getCashAndStocksEvents(filePath: string): {
  cashEvents: PortfolioEvent[];
  openPositions: PortfolioEvent[];
  closedStocksOpenEvents: PortfolioEvent[];
  closedStocksCloseEvents: PortfolioEvent[];
} {
  const workbook = XLSX.readFile(filePath);

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

async function fetchHistoricalStockData(symbol: string, startDate: Date, endDate: Date) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${getStockAPISymbol(symbol)}?period1=${Math.floor(startOfDay(startDate).getTime() / 1000)}&period2=${Math.floor(startOfDay(endDate).getTime() / 1000)}&interval=1d`;
  console.log("Fetching stock close prices for: ", symbol, " from URL: ", url);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
    });
    return await res.json();
  } catch (e) {
    console.warn("Failed to fetch stock close prices for symbol:", symbol, "Error:", e);
    return null;
  }
}

async function fetchSplits(symbol: string): Promise<Split[] | null> {
  const url = `https://www.alphavantage.co/query?function=SPLITS&symbol=${getStockAPISymbol(symbol)}&apikey=${ALPHA_VANTAGE_KEY}`;
  console.log("Fetching split events for: ", symbol, " from URL: ", url);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
    });
    return (await res.json()).data;
  } catch (e) {
    console.warn("Failed to fetch split events for symbol:", symbol, "Error:", e);
    return null;
  }
}

/**
 * Fetches closing prices for a given stock symbol in the specified date range.
 * @param {string} symbol - Stock symbol, e.g. "SMCI"
 * @param {Date} startDate - Start date of the range (inclusive)
 * @param {Date} endDate - End date of the range (inclusive)
 * @returns {Promise<number[] | null>} - Array of closing prices (in order for each day), or null if no data
 */
async function fetchStockClosePriceRange(
  symbol: string,
  startDate: Date,
  endDate: Date,
): Promise<Map<string, number> | null> {
  const data = await fetchHistoricalStockData(symbol, startDate, endDate);
  if (data) {
    const timestamp = data.chart?.result?.[0]?.timestamp;
    const close = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (timestamp && close) {
      const splits = (await fetchSplits(symbol)) as Split[];

      const pricesMap = new Map<string, number>();
      for (let i = 0; i < timestamp.length; i++) {
        const date = new Date(timestamp[i] * 1000);
        if (date >= startDate && date <= endDate) {
          if (splits && splits.length && splits.some((split) => isBefore(date, new Date(split.effective_date)))) {
            let stockPrice = close[i];
            splits
              .filter((split) => isBefore(date, new Date(split.effective_date)))
              .forEach((split) => {
                if (split.split_factor) {
                  stockPrice *= parseFloat(split.split_factor);
                }
              });
            pricesMap.set(format(date, "yyyy-MM-dd"), stockPrice);
          } else {
            pricesMap.set(format(date, "yyyy-MM-dd"), symbol === "AV.UK" ? close[i] / 100 : close[i]); // Adjust for AV.UK price scale
          }
        }
      }
      return pricesMap;
    }
    return null;
  }
  return null;
}

function symbolToYahooSuffix(symbol: string): string {
  if (symbol.endsWith(".UK")) {
    return ".L";
  }
  if (symbol.endsWith(".NL")) {
    return ".AS";
  }
  if (symbol.endsWith(".US")) {
    return "";
  }
  return symbol.includes(".") ? "." + symbol.split(".").at(-1)! : "";
}

// --- CACHE PRICES UTILS ---
type StockPricesRecord = Record<string, Record<string, number | null>>; // symbol -> date(YYYY-MM-DD) -> price

function getStockAPISymbol(symbol: string) {
  if (symbol === "OIL") {
    return "CL=F"; // WTI Crude Oil Futures
  }
  if (symbol === "GOLD") {
    return "GC=F"; // Gold Futures
  }
  if (symbol === "US100") {
    return "^NDX"; // us 100 index
  }
  return symbol.split(".")[0] + symbolToYahooSuffix(symbol);
}

async function populateStockPricesForSymbol(
  symbol: string,
  startDate: Date,
  endDate: Date,
  stockPricesRecord: StockPricesRecord,
) {
  const prices = await fetchStockClosePriceRange(symbol, startDate, endDate);

  if (prices) {
    getDateRange(startDate, endDate).forEach((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      if (!prices.has(dateKey)) {
        let recentDate = addDays(date, -1);
        while (recentDate >= startDate) {
          if (prices.has(format(recentDate, "yyyy-MM-dd"))) {
            stockPricesRecord[symbol][dateKey] = prices.get(format(recentDate, "yyyy-MM-dd")) ?? null;
            break;
          }
          recentDate = addDays(recentDate, -1);
        }
      } else {
        stockPricesRecord[symbol][dateKey] = prices.get(dateKey) ?? null;
      }
    });
    fs.writeJsonSync(getCacheFilePath(symbol, startDate, endDate), stockPricesRecord[symbol]);
  }
}

async function populatePricesForStocks(timeline: TimelineCheckpoint[], startDate: Date): Promise<StockPricesRecord> {
  const symbols = Array.from(new Set(timeline.flatMap((t) => Object.keys(t.stocks))));

  const endDate = new Date();
  const stockPricesRecord: StockPricesRecord = {};
  if (!symbols.includes(SP500)) {
    symbols.push(SP500);
  }
  for (const symbol of symbols) {
    stockPricesRecord[symbol] = {};

    if (fs.existsSync(getCacheFilePath(symbol, startDate, endDate))) {
      stockPricesRecord[symbol] = fs.readJsonSync(getCacheFilePath(symbol, startDate, endDate));
    } else {
      await populateStockPricesForSymbol(symbol, startDate, endDate, stockPricesRecord);
    }

    timeline.forEach((item) => {
      if (Object.keys(item.stocks).some((key) => key === symbol)) {
        const dateKey = format(item.date, "yyyy-MM-dd");
        item.stocks[symbol].price = stockPricesRecord[symbol][dateKey] ?? undefined;
      }
    });
  }

  return stockPricesRecord;
}

function getStocksValueCached(stocks: Record<string, Stock>, date: Date, priceCache: StockPricesRecord): number {
  let stocksValue = 0;
  const dateKey = date.toISOString().slice(0, 10);
  for (const symbol in stocks) {
    const closePrice = priceCache[symbol]?.[dateKey] ?? null;
    if (closePrice !== null) {
      stocksValue += closePrice * stocks[symbol].volume;
    }
  }
  return stocksValue;
}

/**
 * Function generates an array of dates from the start date to the end date (inclusive)
 */
function getDateRange(start: Date, end: Date): Date[] {
  const arr = [];
  const dt = new Date(start);
  while (dt <= end) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

/**
 * Main function: for each day fetches the close price and calculates the portfolio value
 */
async function getPortfolioValueData(
  timeline: TimelineCheckpoint[],
  prices: StockPricesRecord,
): Promise<PortfolioValue[]> {
  // Date range
  const startDate = timeline[0].date;
  const allDates = getDateRange(startDate, addDays(new Date(), -1));

  // For each date, find the portfolio state (cash, stocks) and fetch the close price
  const result: PortfolioValue[] = [];
  for (const day of allDates) {
    const dateKey = format(day, "yyyy-MM-dd");
    // Find events for this day
    const dayEvents = timeline.filter((t) => isSameDay(t.date, day));

    if (dayEvents.length === 0) {
      const previousState = result.at(-1);
      if (!previousState) {
        continue;
      }

      result.push({
        date: day.toISOString(),
        cash: previousState.cash,
        balance: previousState.balance,
        stocks: previousState.stocks,
        portfolioValue: previousState.cash + getStocksValueCached(previousState.stocks, day, prices),
        profitOrLoss: previousState.profitOrLoss,
        sp500Stock: {
          volume: previousState.sp500Stock.volume || 0,
          price: prices[SP500]?.[dateKey] ?? undefined,
        },
        sp500Value: getStocksValueCached({ [SP500]: { volume: previousState.sp500Stock.volume || 0 } }, day, prices),
      });
    } else {
      const finalState = dayEvents.at(-1)!;
      let sp500Volume = result.at(-1)?.sp500Stock.volume || 0;
      if (dayEvents.some((e) => e.cashWithdrawalOrDeposit)) {
        const sp500Price = prices[SP500]?.[format(day, "yyyy-MM-dd")] || null;
        if (sp500Price === null) {
          console.warn("No SP500 price for date:", format(day, "yyyy-MM-dd"));
          continue;
        }
        const withdrawalOrDepositBalance = dayEvents
          .filter((e) => e.cashWithdrawalOrDeposit)
          .reduce((acc, e) => acc + (e.cashWithdrawalOrDeposit || 0), 0);
        sp500Volume += withdrawalOrDepositBalance / sp500Price;
      }

      result.push({
        date: day.toISOString(),
        cash: finalState.cash,
        balance: finalState.balance,
        stocks: finalState.stocks,
        portfolioValue: finalState.cash + getStocksValueCached(finalState.stocks, day, prices),
        profitOrLoss: finalState.profitOrLoss,
        sp500Stock: { volume: sp500Volume, price: prices[SP500]?.[dateKey] ?? undefined },
        sp500Value: getStocksValueCached({ [SP500]: { volume: sp500Volume } }, day, prices),
      });
    }
  }

  return result;
}

function getAssetsAnalysis(
  stockOpenPositions: PortfolioEvent[],
  stockClosedPositionsOpenEvents: PortfolioEvent[],
  stockCloseEvents: PortfolioEvent[],
  prices: StockPricesRecord,
): AssetsHistoricalData {
  return stockOpenPositions
    .concat(stockClosedPositionsOpenEvents)
    .concat(stockCloseEvents)
    .reduce((acc, stockEvent) => {
      if (stockEvent.type === STOCK_OPEN_POSITION) {
        const stockSymbol = stockEvent.stockSymbol;
        if (!stockSymbol) return acc;

        return merge(acc, {
          [stockSymbol]: {
            openPositions: [
              ...(acc[stockSymbol]?.openPositions || []),
              {
                volume: stockEvent.stocksVolumeChange,
                stockValueOnBuy:
                  stockEvent.stocksVolumeChange * (prices[stockSymbol]?.[format(stockEvent.date, "yyyy-MM-dd")] || 0),
                profitOrLoss: stockEvent.profitOrLoss || 0,
              },
            ],
            currentStockPrice: prices[stockSymbol]?.[format(new Date(), "yyyy-MM-dd")] || 0,
          },
        });
      } else if (stockEvent.type === STOCK_OPEN_EVENT) {
        const stockSymbol = stockEvent.stockSymbol;
        if (!stockSymbol) return acc;

        return merge(acc, {
          [stockSymbol]: {
            openEvents: [
              ...(acc[stockSymbol]?.openEvents || []),
              {
                volume: stockEvent.stocksVolumeChange,
                stockValueOnBuy:
                  stockEvent.stocksVolumeChange * (prices[stockSymbol]?.[format(stockEvent.date, "yyyy-MM-dd")] || 0),
              },
            ],
            currentStockPrice: prices[stockSymbol]?.[format(new Date(), "yyyy-MM-dd")] || 0,
          },
        });
      } else if (stockEvent.type === STOCK_CLOSE_EVENT) {
        const stockSymbol = stockEvent.stockSymbol;
        if (!stockSymbol) return acc;

        return merge(acc, {
          [stockSymbol]: {
            closeEvents: [
              ...(acc[stockSymbol]?.closeEvents || []),
              {
                volume: stockEvent.stocksVolumeChange,
                stockValueOnSell:
                  stockEvent.stocksVolumeChange * (prices[stockSymbol]?.[format(stockEvent.date, "yyyy-MM-dd")] || 0),
                profitOrLoss: stockEvent.profitOrLoss || 0,
              },
            ],
            currentStockPrice: prices[stockSymbol]?.[format(new Date(), "yyyy-MM-dd")] || 0,
          },
        });
      }

      return acc;
    }, {} as AssetsHistoricalData);
}

(async () => {
  fs.mkdirp("./dist");
  const { cashEvents, openPositions, closedStocksOpenEvents, closedStocksCloseEvents } =
    getCashAndStocksEvents("./Test spreadsheet.xlsx");

  // Merge and sort all events by date
  const allEvents = [...cashEvents, ...openPositions, ...closedStocksOpenEvents, ...closedStocksCloseEvents].toSorted(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const timeline = createEventTimeline(allEvents);
  if (!timeline.length) return;

  const startDate = timeline[0].date;

  const prices = await populatePricesForStocks(timeline, startDate);
  const portfolioTimeline = await getPortfolioValueData(timeline, prices);
  fs.writeJsonSync("./dist/portfolioTimeline.json", portfolioTimeline, {
    spaces: 2,
  });

  const assetsAnalysis = getAssetsAnalysis(openPositions, closedStocksOpenEvents, closedStocksCloseEvents, prices);
  fs.writeJsonSync("./dist/assetsAnalysis.json", assetsAnalysis, {
    spaces: 2,
  });
})();
