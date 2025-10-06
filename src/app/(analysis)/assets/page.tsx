"use client";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Assets() {
  const { portfolioAnalysis } = useStore();

  if (!portfolioAnalysis) {
    redirect("/");
  }

  const assetsAnalysis = portfolioAnalysis.assetsAnalysis;

  const stocks = useMemo(() => {
    return Array.from(new Set(Object.keys(assetsAnalysis)));
  }, [assetsAnalysis]);

  function getProfitLossTextClass(value: number): string {
    // Progi dla strat
    if (value < -1000) {
      return "text-red-700 font-extrabold text-xl";
    }
    if (value < -100) {
      return "text-red-500 font-bold text-lg";
    }
    if (value < 0) {
      return "text-red-400 font-semibold text-lg";
    }
    // Progi dla zysków
    if (value > 1000) {
      return "text-green-500 font-extrabold text-lg";
    }
    if (value > 100) {
      return "text-green-400 font-bold text-lg";
    }
    if (value > 0) {
      return "text-green-300 font-semibold text-lg";
    }
    // Neutralne
    return "text-gray-300 font-semibold text-lg";
  }

  const stockProfitArray = stocks
    .map((stock) => {
      const assetEvents = assetsAnalysis[stock];
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
    const assetEvents = assetsAnalysis[stock];

    const potentialValue = assetEvents?.openEvents?.reduce(
      (acc: number, val: { volume: number; stockValueOnBuy: number }) => {
        return (
          acc + (assetEvents?.currentStockPrice ? val.volume * assetEvents.currentStockPrice - val.stockValueOnBuy : 0)
        );
      },
      0,
    );

    return { stock, potentialValue: potentialValue ?? 0 };
  });

  return (
    <>
      {" "}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4">
        <h2 className="text-3xl font-bold text-white mb-8 text-center drop-shadow-lg">Assets breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-200 rounded-xl overflow-hidden shadow-lg">
            <thead>
              <tr className="bg-indigo-800/80">
                <th className="px-4 py-3 font-semibold">Asset</th>
                <th className="px-4 py-3 font-semibold">Profit/Loss ($)</th>
                <th className="px-4 py-3 font-semibold">Potential Profit/Loss ($)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {stockProfitArray.map((stockProfit) => {
                const profitOrLoss = stockProfit.profitOrLoss;
                const potentialValue =
                  stockPotentialProfitArray.find((s) => s.stock === stockProfit.stock)?.potentialValue ?? 0;

                return (
                  <tr key={stockProfit.stock} className="hover:bg-indigo-900/30 transition-colors duration-150">
                    <td className="px-4 py-3 border-b border-indigo-700 rounded-l-md">{stockProfit.stock}</td>
                    <td className={`px-4 py-3 border-b border-indigo-700 ${getProfitLossTextClass(profitOrLoss)}`}>
                      {profitOrLoss?.toFixed(2) ?? 0}
                    </td>
                    <td className={`px-4 py-3 border-b border-indigo-700 ${getProfitLossTextClass(potentialValue)}`}>
                      {potentialValue?.toFixed(2) ?? 0}
                    </td>
                    <td className={`px-4 py-3 border-b border-indigo-700 rounded-r-md`}>
                      <Button onClick={() => redirect("/assets/" + stockProfit.stock)} size="icon">
                        <TrendingUp />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-indigo-700/80 font-bold text-white">
                <td className="px-4 py-3 rounded-bl-xl">Total</td>
                <td className="px-4 py-3">
                  {stockProfitArray.reduce((acc, stock) => stock.profitOrLoss + acc, 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 rounded-br-xl">
                  {stockPotentialProfitArray.reduce((acc, stock) => stock.potentialValue + acc, 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
