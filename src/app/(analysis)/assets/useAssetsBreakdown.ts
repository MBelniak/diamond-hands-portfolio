import { PortfolioAnalysis } from "@/lib/types";
import { CFDIndices, formatDate } from "@/lib/utils";
import { useMemo } from "react";

export const useAssetsBreakdown = (portfolioAnalysis: PortfolioAnalysis | undefined | null) => {
  const assetsAnalysis = portfolioAnalysis?.assetsAnalysis;

  const stocks = useMemo(() => {
    return Array.from(new Set(Object.keys(assetsAnalysis ?? {})));
  }, [assetsAnalysis]);

  const stockProfitArray = stocks
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

      return { stock, profitOrLoss: profitOrLoss ?? 0 };
    })
    .toSorted((left, right) => right.profitOrLoss - left.profitOrLoss);

  const stockPotentialProfitArray = stocks.map((stock) => {
    const assetEvents = assetsAnalysis?.[stock];

    const potentialValue = assetEvents?.openEvents?.reduce((acc: number, event) => {
      const currentPrice = portfolioAnalysis?.stockPrices[stock]?.price[formatDate(new Date())];
      const lotSize = stock in CFDIndices ? CFDIndices[stock].lotSize : 1;
      const volume = event.volume * lotSize;
      return acc + (currentPrice ? volume * currentPrice - event.volume * event.stockPriceOnBuy * lotSize : 0);
    }, 0);

    return { stock, potentialValue: potentialValue ?? 0 };
  });

  return {
    stockProfitArray,
    stockPotentialProfitArray,
  };
};
