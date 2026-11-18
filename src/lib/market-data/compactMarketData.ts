import type {
  CompactTickerMarketData,
  ISODateString,
  PortfolioCurrency,
  Split,
  StockMarketData,
  StockTicker,
  TickerMarketData,
  TickerOhlcData,
  TickerQuote,
} from "@/lib/types";

/**
 * Cumulative factor of the splits that took effect after the trading session on `sessionDate`.
 * Yahoo reports a split at the market open of the first post-split session, so the session on the split's
 * effective date is already post-split and every earlier session is pre-split.
 */
export function getSessionSplitFactor(splits: Split[] | undefined, sessionDate: ISODateString): number {
  if (!splits?.length) {
    return 1;
  }
  return splits
    .filter((split) => split.split_factor && sessionDate < split.effective_date)
    .reduce((factor, split) => factor * split.split_factor, 1);
}

/**
 * Rebuilds the per-date quote maps the portfolio analysis works on from the compact (columnar, close-only)
 * representation served by `/api/market-data`. The as-traded (unadjusted) prices are derived from the
 * split-adjusted ones, so only one series needs to go over the wire.
 */
export function expandTickerMarketData(compact: CompactTickerMarketData): TickerMarketData {
  const tickerQuoteByDateString: Record<ISODateString, TickerQuote> = {};
  const splitAdjustedTickerQuoteByDateString: Record<ISODateString, TickerQuote> = {};
  const lastIndex = compact.dates.length - 1;

  compact.dates.forEach((date, index) => {
    const close = compact.close[index] ?? undefined;
    const factor = getSessionSplitFactor(compact.splits, date);
    const isLastSession = index === lastIndex && compact.lastSessionRegularMarketPrice != null;

    splitAdjustedTickerQuoteByDateString[date] = isLastSession
      ? { close, regularMarketPrice: compact.lastSessionRegularMarketPrice! }
      : { close };
    tickerQuoteByDateString[date] = isLastSession
      ? {
          close: close === undefined ? undefined : close * factor,
          regularMarketPrice: compact.lastSessionRegularMarketPrice! * factor,
        }
      : { close: close === undefined ? undefined : close * factor };
  });

  return {
    currency: compact.currency,
    regularMarketPrice: compact.regularMarketPrice,
    longName: compact.longName,
    instrumentType: compact.instrumentType,
    splits: compact.splits,
    tickerQuoteByDateString,
    splitAdjustedTickerQuoteByDateString,
  };
}

export function expandStockMarketData(compactData: CompactTickerMarketData[]): StockMarketData {
  return Object.fromEntries(compactData.map((data) => [data.ticker, expandTickerMarketData(data)]));
}

const getSortedDates = (tickerMarketData: TickerMarketData) =>
  Object.keys(tickerMarketData.splitAdjustedTickerQuoteByDateString).toSorted();

export function toCompactTickerMarketData(
  ticker: StockTicker,
  portfolioCurrency: PortfolioCurrency,
  tickerMarketData: TickerMarketData,
): CompactTickerMarketData {
  const dates = getSortedDates(tickerMarketData);
  const quotes = tickerMarketData.splitAdjustedTickerQuoteByDateString;
  const lastSessionRegularMarketPrice = dates.length ? quotes[dates.at(-1)!].regularMarketPrice : undefined;

  return {
    ticker,
    portfolioCurrency,
    currency: tickerMarketData.currency,
    longName: tickerMarketData.longName,
    instrumentType: tickerMarketData.instrumentType,
    regularMarketPrice: tickerMarketData.regularMarketPrice,
    ...(lastSessionRegularMarketPrice != null ? { lastSessionRegularMarketPrice } : {}),
    splits: tickerMarketData.splits,
    dates,
    close: dates.map((date) => quotes[date].close ?? null),
  };
}

export function toTickerOhlcData(
  ticker: StockTicker,
  portfolioCurrency: PortfolioCurrency,
  tickerMarketData: TickerMarketData,
): TickerOhlcData {
  const dates = getSortedDates(tickerMarketData);
  const quotes = tickerMarketData.splitAdjustedTickerQuoteByDateString;
  const series = (key: "open" | "high" | "low" | "close") => dates.map((date) => quotes[date][key] ?? null);

  return {
    ticker,
    portfolioCurrency,
    dates,
    open: series("open"),
    high: series("high"),
    low: series("low"),
    close: series("close"),
  };
}
