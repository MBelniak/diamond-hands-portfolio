import { PortfolioAnalysis } from "@/lib/types";
import { CFDIndices, formatDate, getStockMarketValue } from "@/lib/utils";
import { useMemo } from "react";

export const useAssetsBreakdown = (
  portfolioAnalysis: PortfolioAnalysis | undefined | null,
): {
  stock: string;
  profitOrLoss: number;
  potentialValue: number;
  openPositionsProfit: number;
  volume: number;
  allocation: number;
  marketValue: number;
}[] => {
  const assetsAnalysis = portfolioAnalysis?.assetsAnalysis;

  const stocks = useMemo(() => {
    return Array.from(new Set(Object.keys(assetsAnalysis ?? {})));
  }, [assetsAnalysis]);

  const summedMarketValue = useMemo(() => {
    return stocks.reduce((acc, stock) => {
      const { marketValue } = getStockMarketValue(stock, assetsAnalysis, portfolioAnalysis?.stockPrices);
      return acc + marketValue;
    }, 0);
  }, [assetsAnalysis, portfolioAnalysis?.stockPrices, stocks]);

  return useMemo(
    () =>
      stocks.map((stock) => {
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

        const { marketValue, volume } = getStockMarketValue(stock, assetsAnalysis, portfolioAnalysis?.stockPrices);

        return {
          stock,
          profitOrLoss: profitOrLoss ?? 0,
          potentialValue: potentialValue ?? 0,
          openPositionsProfit,
          volume,
          allocation: summedMarketValue ? marketValue / summedMarketValue : 0,
          marketValue,
        };
      }),
    [assetsAnalysis, portfolioAnalysis?.stockPrices, stocks, summedMarketValue],
  );
};
