import { describe, expect, it } from "vitest";
import {
  expandTickerMarketData,
  getSessionSplitFactor,
  toCompactTickerMarketData,
  toTickerOhlcData,
} from "@/lib/market-data/compactMarketData";
import { CompactTickerMarketData, PortfolioCurrency, TickerMarketData } from "@/lib/types";

// SMCI.US 10:1 split, effective at the market open on 2024-10-01
const splits = [{ effective_date: "2024-10-01", effective_time: "2024-10-01T13:30:00.000Z", split_factor: 10 }];

const compact: CompactTickerMarketData = {
  ticker: "SMCI.US",
  portfolioCurrency: PortfolioCurrency.USD,
  currency: "USD",
  longName: "Super Micro Computer, Inc.",
  instrumentType: "EQUITY",
  regularMarketPrice: 22,
  lastSessionRegularMarketPrice: 22,
  splits,
  dates: ["2024-09-27", "2024-09-30", "2024-10-01", "2024-10-02"],
  close: [41, 42, null, 21],
};

describe("getSessionSplitFactor", () => {
  it("applies a split to sessions before its effective date only", () => {
    expect(getSessionSplitFactor(splits, "2024-09-30")).toBe(10);
    expect(getSessionSplitFactor(splits, "2024-10-01")).toBe(1);
    expect(getSessionSplitFactor(splits, "2024-10-02")).toBe(1);
  });

  it("multiplies consecutive splits", () => {
    const twoSplits = [{ effective_date: "2021-01-04", split_factor: 2 }, ...splits];
    expect(getSessionSplitFactor(twoSplits, "2020-12-31")).toBe(20);
    expect(getSessionSplitFactor(twoSplits, "2022-06-01")).toBe(10);
  });

  it("returns 1 without splits", () => {
    expect(getSessionSplitFactor(undefined, "2024-09-30")).toBe(1);
  });
});

describe("expandTickerMarketData", () => {
  const expanded = expandTickerMarketData(compact);

  it("keeps the split-adjusted closes", () => {
    expect(expanded.splitAdjustedTickerQuoteByDateString["2024-09-30"]).toEqual({ close: 42 });
    expect(expanded.splitAdjustedTickerQuoteByDateString["2024-10-02"].close).toBe(21);
  });

  it("derives as-traded closes from the splits", () => {
    expect(expanded.tickerQuoteByDateString["2024-09-27"].close).toBe(410);
    expect(expanded.tickerQuoteByDateString["2024-09-30"].close).toBe(420);
    expect(expanded.tickerQuoteByDateString["2024-10-02"].close).toBe(21);
  });

  it("keeps sessions without a close as entries without a price", () => {
    expect(expanded.tickerQuoteByDateString).toHaveProperty("2024-10-01");
    expect(expanded.tickerQuoteByDateString["2024-10-01"].close).toBeUndefined();
  });

  it("attaches the regular market price to the last session only", () => {
    expect(expanded.tickerQuoteByDateString["2024-10-02"].regularMarketPrice).toBe(22);
    expect(expanded.splitAdjustedTickerQuoteByDateString["2024-10-02"].regularMarketPrice).toBe(22);
    expect(expanded.tickerQuoteByDateString["2024-09-30"].regularMarketPrice).toBeUndefined();
  });

  it("keeps the ticker metadata", () => {
    expect(expanded).toMatchObject({
      currency: "USD",
      longName: "Super Micro Computer, Inc.",
      instrumentType: "EQUITY",
      regularMarketPrice: 22,
      splits,
    });
  });
});

describe("toCompactTickerMarketData / toTickerOhlcData", () => {
  const tickerMarketData: TickerMarketData = {
    currency: "USD",
    longName: "Super Micro Computer, Inc.",
    regularMarketPrice: 22,
    splits,
    // Unordered on purpose
    splitAdjustedTickerQuoteByDateString: {
      "2024-10-02": { open: 20, high: 23, low: 19, close: 21, volume: 5, regularMarketPrice: 22 },
      "2024-09-30": { open: 40, high: 43, low: 39, close: 42, volume: 7 },
    },
    tickerQuoteByDateString: {},
  };

  it("serializes close prices in date order and round-trips through expandTickerMarketData", () => {
    const result = toCompactTickerMarketData("SMCI.US", PortfolioCurrency.USD, tickerMarketData);
    expect(result.dates).toEqual(["2024-09-30", "2024-10-02"]);
    expect(result.close).toEqual([42, 21]);
    expect(result.lastSessionRegularMarketPrice).toBe(22);

    const expanded = expandTickerMarketData(result);
    expect(expanded.splitAdjustedTickerQuoteByDateString["2024-09-30"].close).toBe(42);
    expect(expanded.tickerQuoteByDateString["2024-09-30"].close).toBe(420);
  });

  it("serializes candles in date order", () => {
    expect(toTickerOhlcData("SMCI.US", PortfolioCurrency.USD, tickerMarketData)).toEqual({
      ticker: "SMCI.US",
      portfolioCurrency: PortfolioCurrency.USD,
      dates: ["2024-09-30", "2024-10-02"],
      open: [40, 20],
      high: [43, 23],
      low: [39, 19],
      close: [42, 21],
    });
  });
});
