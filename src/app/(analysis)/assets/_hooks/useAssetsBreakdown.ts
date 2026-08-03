import { AssetsHistoricalData, PortfolioAnalysis } from "@/lib/types";
import { getLotSize, getStockMarketValue, sumLotValue } from "@/lib/utils";
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
          const { marketValue, volume, currentPrice } = getStockMarketValue(
            assetSymbol,
            assetsAnalysis,
            portfolioAnalysis?.stockMarketData,
          );
          const lotSize = getLotSize(assetSymbol);

          const unrealizedProfitOrLoss =
            marketValue - sumLotValue(assetEvents.openPositions, lotSize, (p) => p.stockPriceOnBuy);

          const unrealizedProfitOrLossPercentage =
            (unrealizedProfitOrLoss / (marketValue - unrealizedProfitOrLoss) || 0) * 100;

          const realizedProfitOrLoss = assetEvents.closeEvents.reduce(
            (acc: number, closedPosition: { profitOrLoss: number }) => {
              return acc + closedPosition.profitOrLoss;
            },
            0,
          );

          const accProfitOrLoss = realizedProfitOrLoss + unrealizedProfitOrLoss;

          const allEvents = [...(assetEvents?.openEvents ?? []), ...assetEvents.openPositions];
          const potentialValue = currentPrice
            ? sumLotValue(allEvents, lotSize, (e) => currentPrice - e.stockPriceOnBuy)
            : 0;

          return {
            assetSymbol,
            longName: portfolioAnalysis?.stockMarketData[assetSymbol]?.longName ?? assetSymbol,
            instrumentType: portfolioAnalysis?.stockMarketData[assetSymbol]?.instrumentType,
            accProfitOrLoss,
            potentialValue,
            unrealizedProfitOrLoss,
            unrealizedProfitOrLossPercentage,
            volume,
            allocation: summedMarketValue ? marketValue / summedMarketValue : 0,
            marketValue,
          };
        }),
    [assetsAnalysis, portfolioAnalysis?.stockMarketData, stocks, summedMarketValue],
  );
};
