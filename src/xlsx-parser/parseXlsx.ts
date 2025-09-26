// @ts-expect-error no typings for this file
import XLSX from "xlsx/xlsx.js";
import { isSameDay, startOfDay } from "date-fns";
import { addDays } from "date-fns/addDays";
import { isBefore } from "date-fns/isBefore";
import {
  type AssetsHistoricalData,
  type PortfolioAnalysis,
  type PortfolioEvent,
  type PortfolioValue,
  type Split,
  type Stock,
  StockPricesRecord,
  StocksHistoricalPrices,
  type TimelineCheckpoint,
} from "./types";
import { merge } from "lodash-es";
import { createClient, SetOptions } from "redis";
import { getExchangeRatesRedisKey, getStockPricesRedisKey } from "./redis";
import {
  CASH,
  CASH_OPERATION_HISTORY,
  CLOSED_POSITION_HISTORY,
  OPEN_POSITION,
  SP500,
  STOCK_CLOSE_EVENT,
  STOCK_OPEN_EVENT,
  STOCK_OPEN_POSITION,
} from "@/xlsx-parser/consts";
import { formatDate, getDateRange, getStockAPISymbol } from "@/xlsx-parser/utils";

const redis = await createClient({ url: process.env.REDIS_URL }).connect();
const REDIS_EXPIRE_IN_DAY: SetOptions = {
  expiration: {
    type: "EX",
    value: 60 * 60 * 24, // 1 day in seconds
  },
};

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
function getCashEvents(workbook: any): PortfolioEvent[] {
  const cashSheet = workbook.Sheets[CASH_OPERATION_HISTORY];
  const cashData: Record<string, string>[] = XLSX.utils.sheet_to_json(cashSheet);

  const { headerIdx, headerKeys } = extractHeaderAndKeys(cashData, ["Time", "Amount", "Type"] as const);

  return cashData
    .slice(headerIdx + 1)
    .filter((row) => row[headerKeys["Time"]])
    .map((row) => ({
      date: parseXLSXDate(row[headerKeys["Time"]]),
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

  const { headerIdx, headerKeys } = extractHeaderAndKeys(openData, ["Open time", "Volume", "Symbol", "Gross P/L"]);

  return openData
    .slice(headerIdx + 1)
    .filter((row) => row[headerKeys["Open time"]])
    .map((row) => ({
      date: parseXLSXDate(row[headerKeys["Open time"]]),
      stocksVolumeChange: parseFloat(row[headerKeys["Volume"]]) || 0,
      type: STOCK_OPEN_POSITION,
      stockSymbol: row[headerKeys["Symbol"]] || null,
      profitOrLoss: parseFloat(row[headerKeys["Gross P/L"]]) || 0,
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
      date: parseXLSXDate(row[headerKeys["Open time"]]),
      stocksVolumeChange: parseFloat(row[headerKeys["Volume"]]) || 0,
      type: STOCK_OPEN_EVENT,
      stockSymbol: row[headerKeys["Symbol"]] || null,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClosedStocksCloseEvents(workbook: any): PortfolioEvent[] {
  const { closedData, headerIdx, headerKeys } = getClosedOperations(workbook);

  return closedData
    .slice(headerIdx + 1)
    .filter((row) => row[headerKeys["Close time"]])
    .map((row) => ({
      date: parseXLSXDate(row[headerKeys["Close time"]]),
      stocksVolumeChange: parseFloat(row[headerKeys["Volume"]]) || 0,
      type: STOCK_CLOSE_EVENT,
      stockSymbol: row[headerKeys["Symbol"]] || null,
      profitOrLoss: parseFloat(row[headerKeys["Gross P/L"]] || "0"),
    }));
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCashAndStocksEvents(workbook: any): {
  cashEvents: PortfolioEvent[];
  openPositions: PortfolioEvent[];
  closedStocksOpenEvents: PortfolioEvent[];
  closedStocksCloseEvents: PortfolioEvent[];
} {
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

async function fetchHistoricalStockData(
  symbol: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  chart?: {
    result?: {
      timestamp?: number[];
      meta?: { currency: string };
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

function parseSplits(splits: Record<string, { date: number; numerator: number; denominator: number }>): Split[] {
  return Object.values(splits).map((split) => ({
    effective_date: new Date(split.date * 1000).toISOString().slice(0, 10),
    split_factor: (split.numerator / split.denominator).toString(),
  }));
}

/**
 * Converts a price in a given currency to USD using provided rates.
 * @param price - cena w oryginalnej walucie
 * @param currency - kod waluty (np. "EUR", "GBP", "USD", "GBp")
 * @param rates - obiekt kursów walutowych { EUR: 1.08, GBP: 1.25, ... } (kursy względem USD)
 */
function convertToUSD(price: number | undefined, currency: string, rates: Record<string, number>): number | undefined {
  if (!currency || currency === "USD" || price === undefined) {
    return price;
  }
  if (currency === "GBp") {
    // GBp = pensy brytyjskie, 100 GBp = 1 GBP, więc najpierw na GBP, potem na USD
    const gbpPrice = price / 100;
    return rates["USDGBP"] ? gbpPrice * (1 / rates["USDGBP"]) : gbpPrice;
  }
  if (rates["USD" + currency]) {
    return price * (1 / rates["USD" + currency]);
  }
  return price;
}

function populatePriceMapForDate(date: Date, closePrice: number, splits: Split[], prices: StockPricesRecord) {
  const isSplitApplicable = (split: Split): boolean => isBefore(date, new Date(split.effective_date));

  const dateKey = formatDate(date);
  let stockPrice = closePrice;
  // yahoo API already returns converted values
  prices.splitAdjustedPrice[dateKey] = stockPrice;

  splits?.filter(isSplitApplicable).forEach((split) => {
    if (split.split_factor) {
      stockPrice *= parseFloat(split.split_factor);
    }
  });

  prices.price[dateKey] = stockPrice;
}

/**
 * Fetches closing prices for a given stock symbol in the specified date range.
 * Now supports conversion to USD using daily exchange rates.
 */
async function fetchStockClosePriceRange(
  symbol: string,
  startDate: Date,
  endDate: Date,
): Promise<StockPricesRecord | null> {
  const data = await fetchHistoricalStockData(symbol, startDate, endDate);
  if (data) {
    const timestamp = data.chart?.result?.[0]?.timestamp;
    const currency = data.chart?.result?.[0]?.meta?.currency ?? "USD";
    const close = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    const splits = data.chart?.result?.[0]?.events?.splits;

    if (timestamp && close) {
      const pricesRecord = { currency, price: {}, splitAdjustedPrice: {} };

      for (let i = 0; i < timestamp.length; i++) {
        const date = new Date(timestamp[i] * 1000);
        if (date >= startDate && date <= endDate) {
          populatePriceMapForDate(date, close[i], splits ? parseSplits(splits) : [], pricesRecord);
        }
      }
      return pricesRecord;
    }
    return null;
  }
  return null;
}

// Fetches stock prices and fills in empty dates by carrying forward the most recent price
async function populateStockPricesForSymbol(
  symbol: string,
  startDate: Date,
  endDate: Date,
): Promise<StockPricesRecord> {
  const currencyAndPrices = await fetchStockClosePriceRange(symbol, startDate, endDate);

  if (currencyAndPrices) {
    getDateRange(startDate, endDate).forEach((date) => {
      const dateKey = formatDate(date);
      if (!(dateKey in currencyAndPrices.price)) {
        let recentDate = addDays(date, -1);
        while (recentDate >= startDate) {
          if (formatDate(recentDate) in currencyAndPrices.price) {
            currencyAndPrices.price[dateKey] = currencyAndPrices.price[formatDate(recentDate)];
            currencyAndPrices.splitAdjustedPrice[dateKey] =
              currencyAndPrices.splitAdjustedPrice[formatDate(recentDate)];
            break;
          }
          recentDate = addDays(recentDate, -1);
        }
      }
    });
    await redis.set(
      getStockPricesRedisKey(symbol, startDate, endDate),
      JSON.stringify(currencyAndPrices),
      REDIS_EXPIRE_IN_DAY,
    );
    return currencyAndPrices;
  }

  return { currency: "USD", price: {}, splitAdjustedPrice: {} };
}

async function fetchExchangeRates(
  currencies: Set<string>,
  startDate: Date,
): Promise<Record<string, Record<string, number>>> {
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

    console.log("Fetching from " + `https://api.currencylayer.com/timeframe?${searchParams.toString()}`);
    const response = await fetch(`https://api.currencylayer.com/timeframe?${searchParams.toString()}`);

    if (response.ok) {
      const data = (await response.json()).quotes as Record<string, Record<string, number>>;
      exchangeRates = { ...exchangeRates, ...data };
      endDate = addDays(endDate, 365);
    } else {
      throw new Error("Failed to fetch exchange rates:" + (await response.text()));
    }
  }

  await redis.set(getExchangeRatesRedisKey(today), JSON.stringify(exchangeRates), REDIS_EXPIRE_IN_DAY);
  return exchangeRates;
}

async function populatePricesForStocks(
  timeline: TimelineCheckpoint[],
  startDate: Date,
): Promise<StocksHistoricalPrices> {
  const symbols = Array.from(new Set(timeline.flatMap((t) => Object.keys(t.stocks))));

  const endDate = new Date();
  const stockPricesRecord: StocksHistoricalPrices = {};
  if (!symbols.includes(SP500)) {
    symbols.push(SP500);
  }

  for (const symbol of symbols) {
    if (await redis.exists(getStockPricesRedisKey(symbol, startDate, endDate))) {
      stockPricesRecord[symbol] = JSON.parse(
        (await redis.get(getStockPricesRedisKey(symbol, startDate, endDate))) as string,
      );
    } else {
      stockPricesRecord[symbol] = await populateStockPricesForSymbol(symbol, startDate, endDate);
    }

    timeline.forEach((item) => {
      if (Object.keys(item.stocks).some((key) => key === symbol)) {
        const dateKey = formatDate(item.date);
        item.stocks[symbol].price = stockPricesRecord[symbol]?.price[dateKey] ?? undefined;
      }
    });
  }

  return stockPricesRecord;
}

function getStocksValueCached(
  stocks: Record<string, Stock>,
  date: Date,
  priceCache: StocksHistoricalPrices,
  exchangeRates: Record<string, Record<string, number>>,
): number {
  let stocksValue = 0;
  const dateKey = date.toISOString().slice(0, 10);
  for (const symbol in stocks) {
    const closePrice = priceCache[symbol]?.price[dateKey] ?? null;
    if (closePrice !== null) {
      stocksValue +=
        convertToUSD(closePrice, priceCache[symbol].currency, exchangeRates[dateKey])! * stocks[symbol].volume;
    }
  }
  return stocksValue;
}

/**
 * Main function: for each day fetches the close price and calculates the portfolio value
 */
async function getPortfolioValueData(
  timeline: TimelineCheckpoint[],
  prices: StocksHistoricalPrices,
  exchangeRates: Record<string, Record<string, number>>,
): Promise<PortfolioValue[]> {
  // Date range
  const startDate = timeline[0].date;
  const allDates = getDateRange(startDate, addDays(new Date(), -1));

  // For each date, find the portfolio state (cash, stocks) and fetch the close price
  const result: PortfolioValue[] = [];
  for (const day of allDates) {
    const dateKey = formatDate(day);
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
        stocks: Object.fromEntries(
          Object.entries(previousState.stocks).map(([symbol, stock]) => [
            symbol,
            {
              ...stock,
              splitAdjustedPrice: convertToUSD(
                prices[symbol]?.splitAdjustedPrice[dateKey],
                prices[symbol]?.currency,
                exchangeRates[dateKey] || {},
              ),
              price: convertToUSD(
                prices[symbol]?.price[dateKey],
                prices[symbol]?.currency,
                exchangeRates[dateKey] || {},
              ),
            },
          ]),
        ),
        portfolioValue: previousState.cash + getStocksValueCached(previousState.stocks, day, prices, exchangeRates),
        profitOrLoss: previousState.profitOrLoss,
        sp500Stock: {
          volume: previousState.sp500Stock.volume || 0,
          price: convertToUSD(prices[SP500]?.price[dateKey], prices[SP500]?.currency, exchangeRates[dateKey] || {}),
        },
        sp500Value: getStocksValueCached(
          { [SP500]: { volume: previousState.sp500Stock.volume || 0 } },
          day,
          prices,
          exchangeRates,
        ),
      });
    } else {
      const finalState = dayEvents.at(-1)!;
      let sp500Volume = result.at(-1)?.sp500Stock.volume || 0;
      if (dayEvents.some((e) => e.cashWithdrawalOrDeposit)) {
        const sp500Price = prices[SP500]?.price[formatDate(day)] || null;
        if (sp500Price === null) {
          console.warn("No SP500 price for date:", formatDate(day));
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
        stocks: Object.fromEntries(
          Object.entries(finalState.stocks).map(([symbol, stock]) => [
            symbol,
            {
              ...stock,
              splitAdjustedPrice: convertToUSD(
                prices[symbol]?.splitAdjustedPrice[dateKey],
                prices[symbol]?.currency,
                exchangeRates[dateKey] || {},
              ),
              price: convertToUSD(
                prices[symbol]?.price[dateKey],
                prices[symbol]?.currency,
                exchangeRates[dateKey] || {},
              ),
            },
          ]),
        ),
        portfolioValue: finalState.cash + getStocksValueCached(finalState.stocks, day, prices, exchangeRates),
        profitOrLoss: finalState.profitOrLoss,
        sp500Stock: { volume: sp500Volume, price: prices[SP500]?.price[dateKey] ?? undefined },
        sp500Value: getStocksValueCached({ [SP500]: { volume: sp500Volume } }, day, prices, exchangeRates),
      });
    }
  }

  return result;
}

function getAssetsAnalysis(
  stockOpenPositions: PortfolioEvent[],
  stockClosedPositionsOpenEvents: PortfolioEvent[],
  stockCloseEvents: PortfolioEvent[],
  prices: StocksHistoricalPrices,
  exchangeRates: Record<string, Record<string, number>>,
): AssetsHistoricalData {
  return stockOpenPositions
    .concat(stockClosedPositionsOpenEvents)
    .concat(stockCloseEvents)
    .reduce((acc, stockEvent) => {
      const dateKey = formatDate(stockEvent.date);
      const stockSymbol = "stockSymbol" in stockEvent ? stockEvent["stockSymbol"] : null;
      if (!stockSymbol) return acc;

      const currentStockPrice = convertToUSD(
        prices[stockSymbol]?.price[formatDate(new Date())],
        prices[stockSymbol]?.currency,
        exchangeRates[formatDate(new Date())] || {},
      );

      const eventStockPrice = convertToUSD(
        prices[stockSymbol]?.splitAdjustedPrice[dateKey],
        prices[stockSymbol]?.currency,
        exchangeRates[dateKey] || {},
      );

      if (!acc[stockSymbol]) {
        acc[stockSymbol] = {
          openPositions: [],
          closeEvents: [],
          openEvents: [],
          currentStockPrice,
        };
      }

      if (stockEvent.type === STOCK_OPEN_POSITION) {
        return merge(acc, {
          [stockSymbol]: {
            openPositions: [
              ...(acc[stockSymbol]?.openPositions || []),
              {
                date: formatDate(stockEvent.date),
                volume: stockEvent.stocksVolumeChange,
                stockValueOnBuy: eventStockPrice ? stockEvent.stocksVolumeChange * eventStockPrice : undefined,
                profitOrLoss: stockEvent.profitOrLoss,
              },
            ],
            currentStockPrice,
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
                date: formatDate(stockEvent.date),
                volume: stockEvent.stocksVolumeChange,
                stockValueOnBuy: eventStockPrice ? stockEvent.stocksVolumeChange * eventStockPrice : undefined,
              },
            ],
            currentStockPrice,
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
                date: formatDate(stockEvent.date),
                volume: stockEvent.stocksVolumeChange,
                stockValueOnSell: eventStockPrice ? stockEvent.stocksVolumeChange * eventStockPrice : undefined,
                profitOrLoss: stockEvent.profitOrLoss,
              },
            ],
            currentStockPrice,
          },
        });
      }

      return acc;
    }, {} as AssetsHistoricalData);
}

async function getAnalysisFromXlsxBuffer(xlsxArrayBuffer: ArrayBuffer): Promise<PortfolioAnalysis> {
  const workbook = XLSX.read(xlsxArrayBuffer);
  const { cashEvents, openPositions, closedStocksOpenEvents, closedStocksCloseEvents } =
    getCashAndStocksEvents(workbook);

  // Merge and sort all events by date
  const allEvents = [...cashEvents, ...openPositions, ...closedStocksOpenEvents, ...closedStocksCloseEvents].toSorted(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const timeline = createEventTimeline(allEvents);

  if (!timeline.length) return { assetsAnalysis: {}, portfolioTimeline: [] };

  const startDate = timeline[0].date;

  const prices = await populatePricesForStocks(timeline, startDate);
  const currencies = new Set(
    Object.values(prices)
      .map(({ currency }) => currency)
      .filter(Boolean),
  );

  const exchangeRates = await fetchExchangeRates(currencies, startDate);

  const portfolioTimeline = await getPortfolioValueData(timeline, prices, exchangeRates);

  const assetsAnalysis = getAssetsAnalysis(
    openPositions,
    closedStocksOpenEvents,
    closedStocksCloseEvents,
    prices,
    exchangeRates,
  );

  return { assetsAnalysis, portfolioTimeline };
}

export default getAnalysisFromXlsxBuffer;
