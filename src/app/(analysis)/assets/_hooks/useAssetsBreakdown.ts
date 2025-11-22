import { AssetsHistoricalData, PortfolioAnalysis } from "@/lib/types";
import { CFDIndices, formatDate, getStockMarketValue } from "@/lib/utils";
import { useMemo } from "react";
import { Asset } from "../_types";

export const useAssetsBreakdown = (portfolioAnalysis: PortfolioAnalysis | undefined | null): Asset[] => {
  const assetsAnalysis = portfolioAnalysis?.assetsAnalysis;

  const stocks = useMemo(() => {
    return Array.from(new Set(Object.keys(assetsAnalysis ?? {})));
  }, [assetsAnalysis]);

  const summedMarketValue = useMemo(() => {
    return stocks.reduce((acc, stock) => {
      const { marketValue } = getStockMarketValue(stock, assetsAnalysis, portfolioAnalysis?.stockMarketData);
      return acc + marketValue;
    }, 0);
  }, [assetsAnalysis, portfolioAnalysis?.stockMarketData, stocks]);

  return useMemo(
    () =>
      stocks
        .filter((assetSymbol) => !!assetsAnalysis?.[assetSymbol])
        .map((assetSymbol) => {
          const assetEvents = assetsAnalysis?.[assetSymbol] as AssetsHistoricalData[string];
          const { marketValue, volume } = getStockMarketValue(
            assetSymbol,
            assetsAnalysis,
            portfolioAnalysis?.stockMarketData,
          );

          const unrealizedProfitOrLoss =
            marketValue -
            assetEvents.openPositions.reduce((acc, openPosition) => {
              const lotSize = assetSymbol in CFDIndices ? CFDIndices[assetSymbol].lotSize : 1;
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
              const currentPrice = portfolioAnalysis?.stockMarketData[assetSymbol]?.price[formatDate(new Date())];
              const lotSize = assetSymbol in CFDIndices ? CFDIndices[assetSymbol].lotSize : 1;
              const volume = event.volume * lotSize;
              return acc + (currentPrice ? volume * currentPrice - event.volume * event.stockPriceOnBuy * lotSize : 0);
            }, 0);

          return {
            assetSymbol,
            longName: portfolioAnalysis?.stockMarketData[assetSymbol].longName ?? assetSymbol,
            instrumentType: portfolioAnalysis?.stockMarketData[assetSymbol].instrumentType,
            accProfitOrLoss,
            potentialValue,
            unrealizedProfitOrLoss,
            volume,
            allocation: summedMarketValue ? marketValue / summedMarketValue : 0,
            marketValue,
          };
        }),
    [assetsAnalysis, portfolioAnalysis?.stockMarketData, stocks, summedMarketValue],
  );
};
