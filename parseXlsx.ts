// @ts-expect-error no typings for this file
import XLSX from "xlsx/xlsx.js";
import { startOfDay } from "date-fns";
import { isSameDay } from "date-fns";
import fs from "fs-extra";

const CLOSED_POSITION_HISTORY = "CLOSED POSITION HISTORY";
const CASH_OPERATION_HISTORY = "CASH OPERATION HISTORY";
const OPEN_POSITION = "OPEN POSITION";
const STOCK_OPEN = "stockOpen" as const;
const STOCK_CLOSE = "stockClose" as const;
const CASH = "cash" as const;

type PortfolioEvent = {
  date: Date;
  type: typeof CASH | typeof STOCK_OPEN | typeof STOCK_CLOSE;
} & (
  | {
      type: typeof CASH;
      cashChange: number;
    }
  | {
      type: typeof STOCK_OPEN | typeof STOCK_CLOSE;
      stocksVolumeChange: number;
      stockSymbol: string | null;
    }
);

type PortfolioVaule = {
  date: Date;
  cash: number;
  stocks: Record<string, number>;
  portfolioValue: number;
};

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

/**
 * Parses the sheet and tracks the value of cash and stocks over time.
 * Returns an array of objects { date, cash, stocks } sorted ascending by date.
 */
function getCashAndStocksTimeline(filePath: string): {
  date: Date;
  cash: number;
  stocks: Record<string, number>;
}[] {
  const workbook = XLSX.readFile(filePath);
  // Parse cash operation history
  const cashSheet = workbook.Sheets[CASH_OPERATION_HISTORY];
  const cashData: Record<string, string>[] = XLSX.utils.sheet_to_json(cashSheet);

  // Parse open positions history (stocks)
  const openSheet = workbook.Sheets[Object.keys(workbook.Sheets).find((key) => key.startsWith(OPEN_POSITION))!];
  const openData: Record<string, string>[] = XLSX.utils.sheet_to_json(openSheet);

  // Parse closed positions history (stocks)
  const closedSheet = workbook.Sheets[CLOSED_POSITION_HISTORY];
  const closedData: Record<string, string>[] = XLSX.utils.sheet_to_json(closedSheet);

  // CASH: find headers
  const cashHeaderIdx = cashData.findIndex((row) => Object.values(row).includes("Time"));
  const cashHeaders = cashData[cashHeaderIdx];
  const cashKeys = getHeaderKeys(cashHeaders, ["Time", "Amount"] as const);

  // STOCKS: find headers
  const openStocksHeaderIdx = openData.findIndex((row) => Object.values(row).includes("Open time"));
  const openStocksHeaders = openData[openStocksHeaderIdx];
  const openStocksKeys = getHeaderKeys(openStocksHeaders, ["Open time", "Volume", "Purchase value", "Symbol"]);

  const closedStocksHeaderIdx = closedData.findIndex((row) => Object.values(row).includes("Close time"));
  const closedStocksHeaders = closedData[closedStocksHeaderIdx];
  const closedStocksKeys = getHeaderKeys(closedStocksHeaders, [
    "Close time",
    "Open time",
    "Volume",
    "Purchase value",
    "Sale value",
    "Symbol",
  ]);

  // Collect all cash operations
  const cashEvents: PortfolioEvent[] = cashData
    .slice(cashHeaderIdx + 1)
    .filter((row) => row[cashKeys["Time"]])
    .map((row) => ({
      date: parseXLSXDate(row[cashKeys["Time"]]),
      cashChange: parseFloat(row[cashKeys["Amount"]]) || 0,
      type: CASH,
    }));

  // Collect all stock open positions
  const stockOpenEvents: PortfolioEvent[] = openData
    .slice(openStocksHeaderIdx + 1)
    .filter((row) => row[openStocksKeys["Open time"]])
    .map((row) => {
      const volume = parseFloat(row[closedStocksKeys["Volume"]]) || 0;
      return {
        date: parseXLSXDate(row[openStocksKeys["Open time"]]),
        stocksVolumeChange: volume,
        type: STOCK_OPEN,
        stockSymbol: row[openStocksKeys["Symbol"]] || null, // stock symbol, if available
      };
    });

  // Collect all open events from closed positions (stocks)
  const closedStocksOpenEvents: PortfolioEvent[] = closedData
    .slice(closedStocksHeaderIdx + 1)
    .filter((row) => row[closedStocksKeys["Open time"]])
    .map((row) => {
      const volume = parseFloat(row[closedStocksKeys["Volume"]]) || 0;
      return {
        date: parseXLSXDate(row[closedStocksKeys["Open time"]]),
        stocksVolumeChange: volume,
        type: STOCK_OPEN,
        stockSymbol: row[closedStocksKeys["Symbol"]] || null, // stock symbol, if available
      };
    });

  // Collect all stock close positions
  const closedStocksCloseEvents: PortfolioEvent[] = closedData
    .slice(closedStocksHeaderIdx + 1)
    .filter((row) => row[closedStocksKeys["Close time"]])
    .map((row) => {
      const volume = parseFloat(row[closedStocksKeys["Volume"]]) || 0;
      return {
        date: parseXLSXDate(row[closedStocksKeys["Close time"]]),
        stocksVolumeChange: volume,
        type: STOCK_CLOSE,
        stockSymbol: row[closedStocksKeys["Symbol"]] || null, // stock symbol, if available
      };
    });

  // Merge and sort all events by date
  const allEvents = [...cashEvents, ...stockOpenEvents, ...closedStocksOpenEvents, ...closedStocksCloseEvents].toSorted(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  // Store values over time
  let cash = 0;
  const stocks = new Map<string, number>();
  const timeline = [];
  for (const event of allEvents) {
    if (event.type === CASH) {
      cash += event.cashChange;
    } else if (event.type === STOCK_OPEN && event.stockSymbol) {
      if (!stocks.has(event.stockSymbol)) {
        stocks.set(event.stockSymbol, 0);
      }
      stocks.set(event.stockSymbol, stocks.get(event.stockSymbol)! + event.stocksVolumeChange);
    } else if (event.type === STOCK_CLOSE && event.stockSymbol) {
      if (stocks.has(event.stockSymbol)) {
        stocks.set(event.stockSymbol, stocks.get(event.stockSymbol)! - event.stocksVolumeChange);
        if (stocks.get(event.stockSymbol)! <= 1e-6) {
          stocks.delete(event.stockSymbol); // Remove if there are no more stocks
        }
      }
    }
    timeline.push({
      date: event.date,
      cash,
      stocks: Object.fromEntries(stocks), // Create a copy of the stocks map
    });
  }
  return timeline;
}

/**
 * Fetches closing prices for a given stock symbol in the specified date range.
 * @param {string} symbol - Stock symbol, e.g. "SMCI"
 * @param {Date} startDate - Start date of the range (inclusive)
 * @param {Date} endDate - End date of the range (inclusive)
 * @returns {Promise<number[] | null>} - Array of closing prices (in order for each day), or null if no data
 */
async function fetchStockClosePriceRange(symbol: string, startDate: Date, endDate: Date): Promise<number[] | null> {
  // Yahoo Finance API (unofficial endpoint)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor(startOfDay(startDate).getTime() / 1000)}&period2=${Math.floor(startOfDay(endDate).getTime() / 1000)}&interval=1d`;
  console.log("Fetching stock close prices for: ", symbol, " from URL: ", url);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
    });
    const data = await res.json();
    const close = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    return close || null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return null;
  }
}

function symbolToYahooSuffix(symbol: string): string {
  if (symbol.endsWith(".UK")) {
    return ".L";
  }
  if (symbol.endsWith(".US")) {
    return "";
  }
  return symbol.split(".").at(-1) ?? "";
}

// --- CACHE PRICES UTILS ---
type PriceCache = Record<string, Record<string, number | null>>; // symbol -> date(YYYY-MM-DD) -> price

async function fetchPricesForSymbols(symbols: string[], startDate: Date): Promise<PriceCache> {
  const cache: PriceCache = {};
  for (const symbol of symbols) {
    cache[symbol] = {};
    const prices: number[] | null = await fetchStockClosePriceRange(
      symbol.split(".")[0] + symbolToYahooSuffix(symbol),
      startDate,
      new Date(),
    );

    if (prices) {
      getDateRange(startDate, new Date()).forEach((date, index) => {
        const key = date.toISOString().slice(0, 10);
        cache[symbol][key] = prices[index] ?? null;
      });
    }
  }

  return cache;
}

async function getStocksValueCached(
  stocks: Record<string, number>,
  date: Date,
  priceCache: PriceCache,
): Promise<number> {
  let stocksValue = 0;
  const dateKey = date.toISOString().slice(0, 10);
  for (const symbol in stocks) {
    const closePrice = priceCache[symbol]?.[dateKey] ?? null;
    if (closePrice !== null) {
      stocksValue += closePrice * stocks[symbol];
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
async function getPortfolioValueTimeline(filePath: string): Promise<
  {
    date: Date;
    cash: number;
    stocks: Record<string, number>;
    portfolioValue: number;
  }[]
> {
  const timeline = getCashAndStocksTimeline(filePath);
  if (!timeline.length) return [];

  // Date range
  const startDate = timeline[0].date;
  const allDates = getDateRange(startDate, new Date());

  const allSymbols = Array.from(new Set(timeline.flatMap((t) => Object.keys(t.stocks))));
  const priceCache = await fetchPricesForSymbols(allSymbols, startDate);

  // For each date, find the portfolio state (cash, stocks) and fetch the close price
  const result: PortfolioVaule[] = [];
  for (const day of allDates) {
    // Find events for this day
    const dayEvents = timeline.filter((t) => isSameDay(t.date, day));

    if (dayEvents.length === 0) {
      const previousState = result.at(-1);
      if (!previousState) {
        continue;
      }

      result.push({
        date: day,
        cash: previousState.cash,
        stocks: previousState.stocks,
        portfolioValue: previousState.cash + (await getStocksValueCached(previousState.stocks, day, priceCache)),
      });
    } else {
      const finalState = dayEvents.at(-1)!;

      result.push({
        date: day,
        cash: finalState.cash,
        stocks: finalState.stocks,
        portfolioValue: finalState.cash + (await getStocksValueCached(finalState.stocks, day, priceCache)),
      });
    }
  }
  return result;
}

(async () => {
  const portfolioTimeline = await getPortfolioValueTimeline("./Test spreadsheet.xlsx");
  console.dir(portfolioTimeline);
  fs.mkdirp("./dist");
  fs.writeJsonSync("./dist/portfolioTimeline.json", portfolioTimeline, {
    spaces: 2,
  });
})();
