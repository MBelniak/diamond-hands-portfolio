// @ts-expect-error no typings for this file
import XLSX from "xlsx/xlsx.js";
import { isAfter, isSameDay, startOfDay } from "date-fns";
import { addDays } from "date-fns/addDays";
import { isBefore } from "date-fns/isBefore";
import {
  CashEvent,
  ExchangeRates,
  PortfolioData,
  type PortfolioEvent,
  type Split,
  StockMarketData,
  TickerMarketData,
} from "../types";
import { createClient } from "redis";
import {
  getExchangeRatesRedisKey,
  getStockPricesRedisKey as getTickerMarketDataRedisKey,
  REDIS_EXPIRE_IN_DAY,
} from "../redis";
import {
  CASH,
  CASH_OPERATION_HISTORY,
  CLOSED_POSITION_HISTORY,
  OPEN_POSITION,
  STOCK_CLOSE_EVENT,
  STOCK_OPEN_EVENT,
  STOCK_OPEN_POSITION,
} from "@/lib/xlsx-parser/consts";
import { convertToUSD, getDateRange, getStockAPISymbol } from "@/lib/xlsx-parser/utils";
import { setTimeout } from "node:timers/promises";
import { formatDate } from "@/lib/utils";
import { UserEventsRepository } from "@/database/UserEventsRepository";
import { User } from "@clerk/nextjs/server";
import { BenchmarkIndex } from "@/lib/benchmarks";

const redis = await createClient({ url: process.env.REDIS_URL }).connect();

if (!process.env.EXCHANGE_RATES_API_KEY) {
  throw new Error(
    "Please set the EXCHANGE_RATES_API_KEY environment variable in the .env file. See https://currencylayer.com/documentation",
  );
}

const currencylayerApiKey = process.env.EXCHANGE_RATES_API_KEY;

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

// Helper to extract header index and keys from sheet data
function extractHeaderAndKeys<T extends readonly string[]>(
  data: Record<string, string>[],
  headerNames: T,
): { headerIdx: number; headerKeys: Record<T[number], string> } {
  const headerIdx = data.findIndex((row) => Object.values(row).some((val) => headerNames.includes(val as T[number])));
  const headerRow = data[headerIdx];
  const headerKeys = getHeaderKeys(headerRow, headerNames);
  return { headerIdx, headerKeys };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCashEvents(workbook: any): CashEvent[] {
  const cashSheet = workbook.Sheets[CASH_OPERATION_HISTORY];
  const cashData: Record<string, string>[] = XLSX.utils.sheet_to_json(cashSheet);

  const { headerIdx, headerKeys } = extractHeaderAndKeys(cashData, ["Time", "Amount", "Type"] as const);

  return cashData
    .slice(headerIdx + 1)
    .filter((row) => row[headerKeys["Time"]])
    .map((row) => ({
      date: parseXLSXDate(row[headerKeys["Time"]]).toISOString(),
      cashChange: parseFloat(row[headerKeys["Amount"]]) || 0,
      type: CASH,
      cashWithdrawalOrDeposit: ["deposit", "withdrawal", "transfer"].includes(row[headerKeys["Type"]])
        ? parseFloat(row[headerKeys["Amount"]]) || 0
        : null,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStockOpenPositions(workbook: any): PortfolioEvent[] {
  const openSheet = workbook.Sheets[Object.keys(workbook.Sheets).find((key) => key.startsWith(OPEN_POSITION))!];
  const openData: Record<string, string>[] = XLSX.utils.sheet_to_json(openSheet);

  const { headerIdx, headerKeys } = extractHeaderAndKeys(openData, [
    "Open time",
    "Volume",
    "Symbol",
    "Gross P/L",
    "Open price",
  ]);

  return openData
    .slice(headerIdx + 1)
    .filter((row) => row[headerKeys["Open time"]])
    .map((row) => ({
      date: parseXLSXDate(row[headerKeys["Open time"]]).toISOString(),
      stocksVolumeChange: parseFloat(row[headerKeys["Volume"]]) || 0,
      type: STOCK_OPEN_POSITION,
      stockSymbol: row[headerKeys["Symbol"]] || null,
      profitOrLoss: parseFloat(row[headerKeys["Gross P/L"]]) || 0,
      openPrice: parseFloat(row[headerKeys["Open price"]]) || 0,
    }));
}

// Consolidated closed operations extraction
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedOperations(workbook: any) {
  const closedSheet = workbook.Sheets[CLOSED_POSITION_HISTORY];
  const closedData: Record<string, string>[] = XLSX.utils.sheet_to_json(closedSheet);

  const { headerIdx, headerKeys } = extractHeaderAndKeys(closedData, [
    "Close time",
    "Open time",
    "Volume",
    "Symbol",
    "Gross P/L",
    "Open price",
    "Close price",
  ] as const);

  return { closedData, headerIdx, headerKeys };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedStocksOpenEvents(workbook: any): PortfolioEvent[] {
  const { closedData, headerIdx, headerKeys } = getClosedOperations(workbook);

  return closedData
    .slice(headerIdx + 1)
    .filter((row) => row[headerKeys["Open time"]])
    .map((row) => ({
      date: parseXLSXDate(row[headerKeys["Open time"]]).toISOString(),
      stocksVolumeChange: parseFloat(row[headerKeys["Volume"]]) || 0,
      type: STOCK_OPEN_EVENT,
      stockSymbol: row[headerKeys["Symbol"]] || null,
      openPrice: parseFloat(row[headerKeys["Open price"]]) || 0,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedStocksCloseEvents(workbook: any): PortfolioEvent[] {
  const { closedData, headerIdx, headerKeys } = getClosedOperations(workbook);

  return closedData
    .slice(headerIdx + 1)
    .filter((row) => row[headerKeys["Close time"]])
    .map((row) => ({
      date: parseXLSXDate(row[headerKeys["Close time"]]).toISOString(),
      stocksVolumeChange: parseFloat(row[headerKeys["Volume"]]) || 0,
      type: STOCK_CLOSE_EVENT,
      stockSymbol: row[headerKeys["Symbol"]] || null,
      profitOrLoss: parseFloat(row[headerKeys["Gross P/L"]] || "0"),
      closePrice: parseFloat(row[headerKeys["Close price"]]) || 0,
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

async function fetchHistoricalTickerMarketData(
  symbol: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  chart?: {
    result?: {
      timestamp?: number[];
      meta?: {
        currency: string;
        regularMarketPrice: number;
        longName: string;
        instrumentType?: string;
        currentTradingPeriod: { regular: { end: number } };
      };
      indicators?: {
        quote?: {
          close: number[];
        }[];
      };
      events?: {
        splits?: Record<string, { date: number; numerator: number; denominator: number }>;
      };
    }[];
  };
} | null> {
  const searchParams = new URLSearchParams();
  searchParams.set("period1", Math.floor(startOfDay(startDate).getTime() / 1000).toString());
  searchParams.set("period2", Math.floor(startOfDay(endDate).getTime() / 1000).toString());
  searchParams.set("interval", "1d");
  searchParams.set("events", "splits");

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${getStockAPISymbol(symbol)}?${searchParams.toString()}`;
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

const applySplits = (price: number, splits: Split[], date: Date) => {
  let result = price;
  splits
    ?.filter((split: Split) => isSplitApplicable(split, date))
    .forEach((split) => {
      if (split.split_factor) {
        result *= split.split_factor;
      }
    });

  return result;
};

const applyReciprocalSplits = (price: number, splits: Split[], date: Date) => {
  return applySplits(
    price,
    splits.map((split) => ({ ...split, split_factor: 1 / (split.split_factor || 1) })),
    date,
  );
};

function populatePriceMapForDate(date: Date, closePrice: number, splits: Split[], prices: TickerMarketData) {
  const dateKey = formatDate(date);
  // yahoo API already returns converted values
  prices.splitAdjustedPrice[dateKey] = closePrice;
  prices.price[dateKey] = applySplits(closePrice, splits, date);
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
  const data = await fetchHistoricalTickerMarketData(symbol, startDate, endDate);
  if (data) {
    const timestamp = data.chart?.result?.[0]?.timestamp;
    const currency = data.chart?.result?.[0]?.meta?.currency ?? "USD";
    const close = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    const splits = parseSplits(data.chart?.result?.[0]?.events?.splits);
    const regularMarketPrice = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    const tradingPeriodRegularEndTimestamp = data.chart?.result?.[0]?.meta?.currentTradingPeriod?.regular?.end;
    const tradingPeriodRegularEndDate = tradingPeriodRegularEndTimestamp
      ? new Date(tradingPeriodRegularEndTimestamp * 1000)
      : null;
    const longName = data.chart?.result?.[0]?.meta?.longName ?? symbol;
    const instrumentType = data.chart?.result?.[0]?.meta?.instrumentType;

    if (timestamp && close) {
      const pricesRecord = { currency, price: {}, splitAdjustedPrice: {}, longName, instrumentType, splits };

      for (let i = 0; i < timestamp.length; i++) {
        const date = new Date(timestamp[i] * 1000);
        if (date >= startDate && date <= endDate) {
          if (!close[i] && close[i - 1]) {
            close[i] = close[i - 1];
          }
          if (
            tradingPeriodRegularEndDate &&
            (isSameDay(date, tradingPeriodRegularEndDate) || isAfter(date, tradingPeriodRegularEndDate)) &&
            isBefore(new Date(), tradingPeriodRegularEndDate) &&
            regularMarketPrice
          ) {
            // If market is still open and we ask for today's or future date, return current price
            populatePriceMapForDate(date, regularMarketPrice, splits, pricesRecord);
          } else {
            populatePriceMapForDate(date, close[i], splits, pricesRecord);
          }
        }
      }
      return pricesRecord;
    }
    return null;
  }
  return null;
}

// Fetches stock prices and fills in empty dates by carrying forward the most recent price
async function getTickerMarketData(symbol: string, startDate: Date, endDate: Date): Promise<TickerMarketData> {
  const tickerMarketData = await fetchStockClosePriceRange(symbol, startDate, endDate);

  if (tickerMarketData) {
    getDateRange(startDate, endDate).forEach((date) => {
      const dateKey = formatDate(date);
      if (!(dateKey in tickerMarketData.price)) {
        let recentDate = addDays(date, -1);
        while (recentDate >= startDate) {
          if (formatDate(recentDate) in tickerMarketData.price) {
            tickerMarketData.price[dateKey] = tickerMarketData.price[formatDate(recentDate)];
            tickerMarketData.splitAdjustedPrice[dateKey] = tickerMarketData.splitAdjustedPrice[formatDate(recentDate)];
            break;
          }
          recentDate = addDays(recentDate, -1);
        }
      }
    });
    await redis.set(
      getTickerMarketDataRedisKey(symbol, startDate, endDate),
      JSON.stringify(tickerMarketData),
      REDIS_EXPIRE_IN_DAY,
    );
    return tickerMarketData;
  }

  return { currency: "USD", price: {}, splitAdjustedPrice: {}, longName: symbol, splits: [] };
}

async function fetchExchangeRates(currencies: Set<string>, startDate: Date): Promise<ExchangeRates> {
  const today = new Date();
  if (await redis.exists(getExchangeRatesRedisKey(today))) {
    return JSON.parse((await redis.get(getExchangeRatesRedisKey(today))) as string);
  }

  if (currencies.has("GBp")) {
    currencies.delete("GBp");
    currencies.add("GBP");
  }

  let exchangeRates = {};
  let endDate = addDays(startDate, 365);
  while (isBefore(endDate, addDays(new Date(), 365))) {
    const searchParams = new URLSearchParams();
    searchParams.set("start_date", formatDate(addDays(endDate, -365)));
    searchParams.set("end_date", formatDate(isBefore(endDate, new Date()) ? endDate : new Date()));
    searchParams.set("access_key", currencylayerApiKey);
    searchParams.set(
      "currencies",
      Array.from(currencies)
        .filter((c) => c !== "USD")
        .join(","),
    );

    const finalURL = `https://apilayer.net/timeframe?${searchParams.toString()}`;
    console.log("Fetching from " + finalURL);
    const response = await fetch(finalURL);

    if (response.ok) {
      const data = (await response.json()).quotes as ExchangeRates;
      exchangeRates = { ...exchangeRates, ...data };
      endDate = addDays(endDate, 365);
    } else {
      throw new Error("Failed to fetch exchange rates:" + (await response.text()));
    }

    await setTimeout(1000); // To avoid hitting rate limits
  }

  await redis.set(getExchangeRatesRedisKey(today), JSON.stringify(exchangeRates), REDIS_EXPIRE_IN_DAY);
  return exchangeRates;
}

const getRawMarketData = async (stocks: Set<string>, startDate: Date, endDate: Date) => {
  return await Promise.all(
    Array.from(stocks).map(async (symbol) => {
      let marketData: TickerMarketData;
      if (await redis.exists(getTickerMarketDataRedisKey(symbol, startDate, endDate))) {
        marketData = JSON.parse((await redis.get(getTickerMarketDataRedisKey(symbol, startDate, endDate))) as string);
      } else {
        marketData = await getTickerMarketData(symbol, startDate, endDate);
      }
      return { symbol, marketData };
    }),
  );
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

const getPortfolioEvents = async (user: User): Promise<PortfolioData["portfolioEvents"] | null> => {
  return await UserEventsRepository.getEventsFromDB(user);
};

const convertMarketDataToUSD = async (stockMarketData: StockMarketData, exchangeRates: ExchangeRates) => {
  for (const [symbol, priceRecord] of Object.entries(stockMarketData)) {
    for (const [date, price] of Object.entries(priceRecord.price)) {
      stockMarketData[symbol].price[date] = convertToUSD(price, priceRecord.currency, exchangeRates[date] || {})!;
    }
    for (const [date, price] of Object.entries(priceRecord.splitAdjustedPrice)) {
      stockMarketData[symbol].splitAdjustedPrice[date] = convertToUSD(
        price,
        priceRecord.currency,
        exchangeRates[date] || {},
      )!;
    }
  }
};

const adjustEventPrices = (
  events: PortfolioData["portfolioEvents"],
  exchangeRates: ExchangeRates,
  stockMarketData: StockMarketData,
) => {
  const { openPositions, closedStocksOpenEvents, closedStocksCloseEvents } = events;
  [...openPositions, ...closedStocksOpenEvents, ...closedStocksCloseEvents].forEach((event) => {
    const date = formatDate(new Date(event.date));
    if (event.type === STOCK_OPEN_POSITION || event.type === STOCK_OPEN_EVENT) {
      const stockSymbol = event.stockSymbol!;

      event.openPrice =
        convertToUSD(event.openPrice, stockMarketData[stockSymbol].currency, exchangeRates[date] || {}) ??
        event.openPrice;

      event.openPrice = applyReciprocalSplits(
        event.openPrice,
        stockMarketData[stockSymbol].splits,
        new Date(event.date),
      );
    }

    if (event.type === STOCK_CLOSE_EVENT) {
      const stockSymbol = event.stockSymbol!;
      event.closePrice =
        convertToUSD(event.closePrice, stockMarketData[stockSymbol].currency, exchangeRates[date] || {}) ??
        event.closePrice;

      event.closePrice = applyReciprocalSplits(
        event.closePrice,
        stockMarketData[stockSymbol].splits,
        new Date(event.date),
      );
    }
  });
};

export async function uploadPortfolioData(user: User, xlsxArrayBuffer: ArrayBuffer): Promise<void> {
  const events = parsePortfolioEvents(xlsxArrayBuffer);
  await UserEventsRepository.saveEventsToDB(events, user);
}

export async function getPortfolioData(user: User): Promise<PortfolioData | null> {
  const events = await getPortfolioEvents(user);
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
      .map(({ currency }) => currency)
      .filter(Boolean),
  );

  const exchangeRates = await fetchExchangeRates(currencies, startDate).catch(() => ({}) as ExchangeRates);

  await convertMarketDataToUSD(stockMarketData, exchangeRates);
  adjustEventPrices(events, exchangeRates, stockMarketData);

  return {
    portfolioEvents: events,
    stockMarketData,
  };
}
