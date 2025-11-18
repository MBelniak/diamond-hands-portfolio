import { AssetsHistoricalData, PortfolioAnalysis } from "@/lib/types";
import { CFDIndices, formatDate, getStockMarketValue } from "@/lib/utils";
import { useMemo } from "react";

export const useAssetsBreakdown = (
  portfolioAnalysis: PortfolioAnalysis | undefined | null,
): {
  stock: string;
  accProfitOrLoss: number;
  potentialValue: number;
  unrealizedProfitOrLoss: number;
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
      stocks
        .filter((stock) => !!assetsAnalysis?.[stock])
        .map((stock) => {
          const assetEvents = assetsAnalysis?.[stock] as AssetsHistoricalData[string];
          const { marketValue, volume } = getStockMarketValue(stock, assetsAnalysis, portfolioAnalysis?.stockPrices);

          const unrealizedProfitOrLoss =
            marketValue -
            assetEvents.openPositions.reduce((acc, openPosition) => {
              const lotSize = stock in CFDIndices ? CFDIndices[stock].lotSize : 1;
              return acc + openPosition.volume * openPosition.stockPriceOnBuy * lotSize;
            }, 0);

          const realizedProfitOrLoss = assetEvents.closeEvents.reduce(
            (acc: number, closedPosition: { profitOrLoss: number }) => {
              return acc + closedPosition.profitOrLoss;
            },
            0,
          );

          const accProfitOrLoss = realizedProfitOrLoss + unrealizedProfitOrLoss;

          const potentialValue = assetEvents?.openEvents
            ?.concat(assetEvents.openPositions)
            .reduce((acc: number, event) => {
              const currentPrice = portfolioAnalysis?.stockPrices[stock]?.price[formatDate(new Date())];
              const lotSize = stock in CFDIndices ? CFDIndices[stock].lotSize : 1;
              const volume = event.volume * lotSize;
              return acc + (currentPrice ? volume * currentPrice - event.volume * event.stockPriceOnBuy * lotSize : 0);
            }, 0);

          return {
            stock,
            accProfitOrLoss,
            potentialValue,
            unrealizedProfitOrLoss,
            volume,
            allocation: summedMarketValue ? marketValue / summedMarketValue : 0,
            marketValue,
          };
        }),
    [assetsAnalysis, portfolioAnalysis?.stockPrices, stocks, summedMarketValue],
  );
};
