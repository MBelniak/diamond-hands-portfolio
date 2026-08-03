import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";
import { AssetsHistoricalData, StockMarketData } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProfitLossClass(profitOrLoss: number) {
  if (profitOrLoss > 0) return "text-green-600 dark:text-green-500";
  if (profitOrLoss < 0) return "text-red-600 dark:text-red-500";
  return "text-gray-900 dark:text-gray-200";
}

export const isBrowser = () => typeof window !== "undefined";

export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export const CFDIndices: Record<string, { lotSize: number }> = {
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
  const assetEvents = assetsAnalysis?.[stock];
  const openPositions = assetEvents?.openPositions ?? [];
  const lotSize = getLotSize(stock);
  const currentPrice = stockMarketData?.[stock]?.regularMarketPrice;

  const volume = sumLotValue(openPositions, lotSize, () => 1);
  const marketValue = currentPrice ? sumLotValue(openPositions, lotSize, () => currentPrice) : 0;

  return { marketValue, volume, currentPrice };
}
