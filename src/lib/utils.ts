import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";
import { AssetsHistoricalData, BenchmarkData, StockMarketData } from "@/lib/types";
import { BenchmarkIndex } from "./benchmarks";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAverage(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getRangeForPeriod(
  timelineLength: number,
  period: "30d" | "90d" | "1y" | "all",
): [number, number] | null {
  if (!timelineLength) {
    return null;
  }

  const periodDays: Record<"30d" | "90d" | "1y" | "all", number | null> = {
    "30d": 30,
    "90d": 90,
    "1y": 365,
    all: null,
  };

  if (periodDays[period] === null) {
    return [0, timelineLength - 1];
  }

  const periodWindow = Math.min(periodDays[period]!, timelineLength);
  return [Math.max(0, timelineLength - periodWindow), timelineLength - 1];
}

export function getFilteredTimeline<T>(items: T[], range: readonly [number, number]): T[] {
  const [start, end] = range;
  return items.slice(start, end + 1);
}

export function getAverageDailyReturnForRange<T extends { dailyReturn: number }>(
  timeline: T[],
  range: readonly [number, number],
): number {
  return getAverage(getFilteredTimeline(timeline, range).map((item) => item.dailyReturn));
}

export function getBenchmarkDailyReturnsForRange(
  timeline: { benchmarkData: Record<BenchmarkIndex, BenchmarkData> }[],
  range: readonly [number, number],
  benchmark: BenchmarkIndex,
): number[] {
  return getFilteredTimeline(timeline, range).map((entry) => entry.benchmarkData[benchmark].dailyReturn);
}

export function getAverageBenchmarkDailyReturnForRange(
  timeline: { benchmarkData: Record<BenchmarkIndex, BenchmarkData> }[],
  range: readonly [number, number],
  benchmark: BenchmarkIndex,
): number {
  return getAverage(getBenchmarkDailyReturnsForRange(timeline, range, benchmark));
}

export function getProfitLossClass(profitOrLoss: number) {
  if (profitOrLoss > 0) return "text-green-600 dark:text-green-500";
  if (profitOrLoss < 0) return "text-red-600 dark:text-red-500";
  return "text-gray-900 dark:text-gray-200";
}

const moneyFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formats an amount as e.g. "$1,234.56" / "-$31.65"; pass `signed` to prefix positive values with "+". */
export function formatMoney(value: number, currencySymbol: string, { signed = false }: { signed?: boolean } = {}) {
  const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  return `${sign}${currencySymbol}${moneyFormatter.format(Math.abs(value))}`;
}

/** Formats a percentage as e.g. "12.34%"; pass `signed` to prefix positive values with "+". */
export function formatPercent(value: number, { signed = false }: { signed?: boolean } = {}) {
  return `${signed && value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export const isBrowser = () => typeof window !== "undefined";

export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

const CFDIndices: Record<string, { lotSize: number }> = {
  GOLD: {
    lotSize: 100, // leverage is already included in the volume in xtb report.
  },
  OIL: {
    lotSize: 1000,
  },
  DE40: {
    lotSize: 20,
  },
};

export function getLotSize(symbol: string): number {
  return symbol in CFDIndices ? CFDIndices[symbol].lotSize : 1;
}

/** Sums `volume × lotSize × getPrice(event)` for each event in the array. */
export function sumLotValue<T extends { volume: number }>(
  events: T[],
  lotSize: number,
  getPrice: (event: T) => number,
): number {
  return events.reduce((acc, e) => acc + (e.volume ?? 0) * lotSize * getPrice(e), 0);
}

/**
 * Returns market value, aggregated volume (taking lotSize into account) and currentPrice for a given stock symbol.
 * - marketValue is calculated from openPositions using the provided stock prices for the given date (defaults to today).
 * - volume takes CFD lot sizes into account when the symbol is defined in CFDIndices.
 */
export function getStockMarketValue(
  stock: string,
  assetsAnalysis?: AssetsHistoricalData,
  stockMarketData?: StockMarketData,
): { marketValue: number; volume: number; currentPrice: number | undefined } {
  const openPositions = assetsAnalysis?.[stock]?.openPositions ?? [];
  const lotSize = getLotSize(stock);
  const currentPrice = stockMarketData?.[stock]?.regularMarketPrice;

  const volume = sumLotValue(openPositions, lotSize, () => 1);
  const marketValue = currentPrice ? sumLotValue(openPositions, lotSize, () => currentPrice) : 0;

  return { marketValue, volume, currentPrice };
}

export const isPathNested = (path: string): boolean => path.split("/").filter(Boolean).length > 1;
