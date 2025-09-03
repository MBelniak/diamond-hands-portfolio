import assetsAnalysis from "../../../dist/assetsAnalysis.json";
import { useMemo } from "react";
import type { AssetsHistoricalData } from "../../../types";

export const Assets = () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const assetsHistoricalData = assetsAnalysis as AssetsHistoricalData[];

  const stocks = useMemo(() => {
    return Array.from(new Set(Object.keys(assetsHistoricalData)));
  }, [assetsHistoricalData]);

  function getProfitLossBgColor(value: number): string {
    if (maxProfitLoss === minProfitLoss) return "";
    if (value < 0) {
      return `hsl(0 100% ${(60 + ((minProfitLoss - value) / minProfitLoss) * 40).toFixed(0)}%)`;
    }
    return `hsl(105 100% ${(60 + ((maxProfitLoss - value) / maxProfitLoss) * 40).toFixed(0)}%)`;
  }

  const stockProfitArray = stocks
    .map((stock) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const assetEvents = assetsHistoricalData[stock];
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const assetEvents = assetsHistoricalData[stock];

    const potentialValue = assetEvents?.openEvents?.reduce(
      (acc: number, val: { volume: number; stockValueOnBuy: number }) => {
        return acc + (val.volume * assetEvents?.currentStockPrice - val.stockValueOnBuy);
      },
      0,
    );

    return { stock, potentialValue: potentialValue ?? 0 };
  });

  const minProfitLoss = Math.min(...stockProfitArray.map((s) => s.profitOrLoss));
  const maxProfitLoss = Math.max(...stockProfitArray.map((s) => s.profitOrLoss));

  return (
    <div className={"p-8"}>
      <h2 className={"text-left mb-4 text-xl"}>Assets breakdown</h2>
      <table className={"w-[600px]"}>
        <thead>
          <tr>
            <th className={"border border-solid border-[#ccc] p-1"}>Asset</th>
            <th className={"border border-solid border-[#ccc] p-1"}>Profit/Loss ($)</th>
            <th className={"border border-solid border-[#ccc] p-1"}>Potential Profit/Loss ($)</th>
          </tr>
        </thead>
        <tbody>
          {stockProfitArray.map((stockProfit) => {
            const profitOrLoss = stockProfit.profitOrLoss;
            const potentialValue =
              stockPotentialProfitArray.find((s) => s.stock === stockProfit.stock)?.potentialValue ?? 0;

            const bgColor = getProfitLossBgColor(profitOrLoss);
            const potentialBgColor = getProfitLossBgColor(potentialValue);

            return (
              <tr key={stockProfit.stock}>
                <td className={"border border-solid border-[#ccc] p-1"}>{stockProfit.stock}</td>
                <td className={`border border-solid border-[#ccc] p-1`} style={{ backgroundColor: bgColor }}>
                  {profitOrLoss?.toFixed(2) ?? 0}
                </td>
                <td className={`border border-solid border-[#ccc] p-1`} style={{ backgroundColor: potentialBgColor }}>
                  {potentialValue?.toFixed(2) ?? 0}
                </td>
              </tr>
            );
          })}
          <tr className={"bg-accent"}>
            <td className={"border border-solid border-[#ccc] p-1"}>Total</td>
            <td className={`border border-solid border-[#ccc] p-1`}>
              {stockProfitArray.reduce((acc, stock) => stock.profitOrLoss + acc, 0).toFixed(2)}
            </td>
            <td className={`border border-solid border-[#ccc] p-1`}>
              {stockPotentialProfitArray.reduce((acc, stock) => stock.potentialValue + acc, 0).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
