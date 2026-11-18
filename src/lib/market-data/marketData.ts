import { isSplitApplicable } from "@/lib/splits";
import {
  ExchangeRates,
  PortfolioCurrency,
  type Split,
  StockMarketData,
  StockTicker,
  TickerMarketData,
  TickerQuote,
} from "@/lib/types";
import { AbstractRedisClient } from "@/lib/redis";
import { convertToCurrency, getPricesFromTickerQuote } from "@/lib/xlsx-parser/utils";
import { formatDate } from "@/lib/utils";
import { YahooAPIHelper } from "@/lib/yahoo-api/YahooAPIHelper";
import { ExchangeRatesHelper } from "@/lib/exchange-rates/ExchangeRatesHelper";
import { getRatesForDate } from "@/lib/exchange-rates/rateWindows";
import iocContainer from "@/iocContainer";

/** Market data is fetched from this date on, for every ticker. */
const MARKET_DATA_START_DATE = new Date(2022, 0, 0);

function parseSplits(splits?: Record<string, { date: number; numerator: number; denominator: number }>): Split[] {
  return Object.values(splits ?? {}).map((split) => ({
    effective_date: new Date(split.date * 1000).toISOString().slice(0, 10),
    effective_time: new Date(split.date * 1000).toISOString(),
    split_factor: split.numerator / split.denominator,
  }));
}

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

export const applyReciprocalSplits = <PTickerQuote extends Partial<TickerQuote>>(
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
 * Fetches daily quotes for a given stock symbol from the start date until today, in the instrument's currency.
 */
async function fetchStockClosePriceRange(symbol: string, startDate: Date): Promise<TickerMarketData | null> {
  const endDate = new Date();
  const data = await YahooAPIHelper.fetchHistoricalTickerMarketData(symbol, startDate, endDate);
  const result = data?.chart?.result;
  const quote = result?.[0]?.indicators?.quote?.[0];
  const timestamp = result?.[0]?.timestamp;
  if (!result || !quote || !timestamp) {
    return null;
  }

  const currency = result[0].meta?.currency ?? "USD";
  const splits = parseSplits(result[0].events?.splits);
  const regularMarketPrice = result[0].meta?.regularMarketPrice;
  const longName = result[0].meta?.longName ?? symbol;
  const instrumentType = result[0].meta?.instrumentType;

  const pricesRecord: TickerMarketData = {
    currency,
    tickerQuoteByDateString: {},
    splitAdjustedTickerQuoteByDateString: {},
    regularMarketPrice: regularMarketPrice ?? 0,
    longName,
    instrumentType,
    splits,
  };

  let previousTickerQuote: Partial<TickerQuote> = {};

  for (let i = 0; i < timestamp.length; i++) {
    const date = new Date(timestamp[i] * 1000);

    if (date < startDate || date > endDate) {
      continue;
    }

    const isLastTimestamp = i === timestamp.length - 1;

    const tickerQuote: TickerQuote = {
      open: quote.open[i],
      close: quote.close[i],
      high: quote.high[i],
      low: quote.low[i],
      volume: quote.volume[i],
    };

    if (isLastTimestamp && regularMarketPrice) {
      tickerQuote.regularMarketPrice = regularMarketPrice;
    }

    Object.keys(tickerQuote).forEach((key) => {
      const _key = key as keyof typeof tickerQuote;
      if (tickerQuote[_key] === null || tickerQuote[_key] === undefined) {
        if (_key === "close" && isLastTimestamp && regularMarketPrice) {
          tickerQuote[_key] = regularMarketPrice;
        } else if (quote.close[i] != null) {
          tickerQuote[_key] = quote.close[i];
        } else if (quote.high[i] != null) {
          tickerQuote[_key] = quote.high[i];
        } else if (previousTickerQuote[_key] != null) {
          tickerQuote[_key] = previousTickerQuote[_key]!;
        }
      }
    });

    previousTickerQuote = { ...tickerQuote };

    populatePriceMapForDate(date, tickerQuote, splits, pricesRecord);
  }

  return pricesRecord;
}

/**
 * Returns prices in each stock's original currency, from the Redis cache or Yahoo. Tickers without data are omitted.
 */
async function getRawStockMarketData(tickers: Iterable<StockTicker>): Promise<StockMarketData> {
  const redis = iocContainer.get<AbstractRedisClient>(AbstractRedisClient);
  const stockMarketData: StockMarketData = {};

  await Promise.all(
    Array.from(tickers).map(async (ticker) => {
      let marketData = await redis.getCachedMarketData(ticker, MARKET_DATA_START_DATE);
      if (marketData === null) {
        marketData = await fetchStockClosePriceRange(ticker, MARKET_DATA_START_DATE);
        if (marketData) {
          await redis.cacheMarketData(ticker, MARKET_DATA_START_DATE, marketData);
        } else {
          console.warn(`No market data found for symbol: ${ticker}`);
        }
      }
      if (marketData) {
        stockMarketData[ticker] = marketData;
      }
    }),
  );

  return stockMarketData;
}

const convertMarketDataToCurrency = (
  stockMarketData: StockMarketData,
  exchangeRates: ExchangeRates,
  portfolioCurrency: PortfolioCurrency,
) => {
  for (const marketData of Object.values(stockMarketData)) {
    const convert = (price: number | undefined, date: Date | string) =>
      convertToCurrency(price, getRatesForDate(exchangeRates, date), marketData.currency, portfolioCurrency)!;

    marketData.regularMarketPrice = convert(marketData.regularMarketPrice, new Date());
    for (const quotes of [marketData.tickerQuoteByDateString, marketData.splitAdjustedTickerQuoteByDateString]) {
      for (const [date, tickerQuote] of Object.entries(quotes)) {
        for (const key of Object.keys(getPricesFromTickerQuote(tickerQuote)) as (keyof TickerQuote)[]) {
          tickerQuote[key] = convert(tickerQuote[key], date);
        }
      }
    }
  }
};

/**
 * Market data of the given tickers with prices converted to the portfolio currency, plus the exchange rates used.
 */
export async function getStockMarketData(
  tickers: Iterable<StockTicker>,
  portfolioCurrency: PortfolioCurrency,
  { cacheOnlyExchangeRates = false }: { cacheOnlyExchangeRates?: boolean } = {},
): Promise<{ stockMarketData: StockMarketData; exchangeRates: ExchangeRates }> {
  // Fresh objects either way (parsed from the cache or just fetched), so converting them in place is safe
  const stockMarketData = await getRawStockMarketData(tickers);

  const currencies = new Set(
    Object.values(stockMarketData)
      .map(({ currency }) => currency)
      .filter(Boolean),
  );

  const exchangeRates = await new ExchangeRatesHelper()
    .getExchangeRates(currencies, portfolioCurrency, MARKET_DATA_START_DATE, { cacheOnly: cacheOnlyExchangeRates })
    .catch((error) => {
      console.error("Failed to get exchange rates:", error);
      return {} as ExchangeRates;
    });

  convertMarketDataToCurrency(stockMarketData, exchangeRates, portfolioCurrency);

  return { stockMarketData, exchangeRates };
}

/**
 * Market data of a single ticker. Exchange rates come from the cache only (warmed by `/api/portfolio`), so that the
 * asset chart's requests never hit the rate-limited exchange rates API.
 */
export async function getTickerMarketData(
  ticker: StockTicker,
  portfolioCurrency: PortfolioCurrency,
): Promise<TickerMarketData | null> {
  const { stockMarketData } = await getStockMarketData([ticker], portfolioCurrency, { cacheOnlyExchangeRates: true });
  return stockMarketData[ticker] ?? null;
}
