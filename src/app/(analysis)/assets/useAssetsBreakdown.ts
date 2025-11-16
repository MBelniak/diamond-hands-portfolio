import { PortfolioAnalysis } from "@/lib/types";
import { CFDIndices, formatDate } from "@/lib/utils";
import { useMemo } from "react";

export const useAssetsBreakdown = (
  portfolioAnalysis: PortfolioAnalysis | undefined | null,
): {
  stock: string;
  profitOrLoss: number;
  potentialValue: number;
  openPositionsProfit: number;
}[] => {
  const assetsAnalysis = portfolioAnalysis?.assetsAnalysis;

  const stocks = useMemo(() => {
    return Array.from(new Set(Object.keys(assetsAnalysis ?? {})));
  }, [assetsAnalysis]);

  const assetsBreakdown = stocks
    .map((stock) => {
      const assetEvents = assetsAnalysis?.[stock];
      let profitOrLoss = 0;

      if (assetEvents?.closeEvents) {
        profitOrLoss += assetEvents.closeEvents.reduce((acc: number, closedPosition: { profitOrLoss: number }) => {
          return acc + closedPosition.profitOrLoss;
        }, 0);
      }

      if (assetEvents?.openPositions) {
        profitOrLoss += assetEvents.openPositions.reduce((acc: number, openPosition: { profitOrLoss: number }) => {
          return acc + openPosition.profitOrLoss;
        }, 0);
      }

      const potentialValue = assetEvents?.openEvents?.reduce((acc: number, event) => {
        const currentPrice = portfolioAnalysis?.stockPrices[stock]?.price[formatDate(new Date())];
        const lotSize = stock in CFDIndices ? CFDIndices[stock].lotSize : 1;
        const volume = event.volume * lotSize;
        return acc + (currentPrice ? volume * currentPrice - event.volume * event.stockPriceOnBuy * lotSize : 0);
      }, 0);

      const openPositions = assetsAnalysis?.[stock]?.openPositions ?? [];
      const openPositionsProfit = openPositions.reduce(
        (s: number, pos: { profitOrLoss: number }) => s + (pos.profitOrLoss ?? 0),
        0,
      );

      return { stock, profitOrLoss: profitOrLoss ?? 0, potentialValue: potentialValue ?? 0, openPositionsProfit };
    })
    .toSorted((left, right) => right.profitOrLoss - left.profitOrLoss);

  return assetsBreakdown;
};
