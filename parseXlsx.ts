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
        if (stocks.get(event.stockSymbol)! <= 0) {
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
 * Helper function to fetch stock close price from Yahoo Finance (or other API)
 * @param {string} symbol - stock symbol, e.g. SMCI
 * @param {string} dateStr - date in format YYYY-MM-DD
 * @returns {Promise<number|null>} - close price or null if no data
 */
async function fetchStockClosePrice(symbol: string, date: Date): Promise<number | null> {
  // Yahoo Finance API (unofficial endpoint)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor(startOfDay(date).getTime() / 1000)}&period2=${Math.floor(startOfDay(date).getTime() / 1000) + 60 * 60 * 24}&interval=1d`;
  console.log("Fetching stock close price for: ", symbol, " on date: ", date.toISOString(), " from URL: ", url);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
    });
    const data = await res.json();
    const close = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.[0];
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

async function getStocksValue(stocks: Record<string, number>, date: Date): Promise<number> {
  let stocksValue = 0;

  const pricesResponses = await Promise.allSettled(
    Object.keys(stocks).map((symbol) => fetchStockClosePrice(symbol.split(".")[0] + symbolToYahooSuffix(symbol), date)),
  );

  const closePrices = pricesResponses.reduce(
    (acc, res, idx) => {
      if (res.status === "fulfilled" && res.value !== null) {
        acc[Object.keys(stocks)[idx]] = res.value;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  for (const symbol in stocks) {
    const closePrice = closePrices[symbol] || null;
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
  const firstDate = timeline[0].date;
  const lastDate = timeline[timeline.length - 1].date;
  const allDates = getDateRange(firstDate, lastDate);

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
        portfolioValue:
          previousState.cash +
          ((await getStocksValue(previousState.stocks, day)) ||
            (Object.keys(previousState.stocks).length ? previousState.portfolioValue - previousState.cash : 0)), // Take stocks value from previous day if present in case the yahoo API returns 0 due to weekend.
      });
    } else {
      const finalState = dayEvents.at(-1)!;

      result.push({
        date: day,
        cash: finalState.cash,
        stocks: finalState.stocks,
        portfolioValue:
          finalState.cash +
          ((await getStocksValue(finalState.stocks, day)) ||
            (Object.keys(finalState.stocks).length && result.at(-1)?.portfolioValue
              ? (result.at(-1)!.portfolioValue ?? 0 - result.at(-1)!.cash)
              : 0)),
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
