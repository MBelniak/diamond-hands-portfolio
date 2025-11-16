"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useAssetsBreakdown } from "@/app/(analysis)/assets/useAssetsBreakdown";

function getProfitLossTextClass(value: number): string {
  // Loss thresholds
  if (value < -1000) {
    return "text-red-600 dark:text-red-700 font-extrabold text-xl";
  }
  if (value < -100) {
    return "text-red-500 dark:text-red-500 font-bold text-lg";
  }
  if (value < 0) {
    return "text-red-400 dark:text-red-400 font-semibold text-lg";
  }
  // Profit thresholds
  if (value > 1000) {
    return "text-green-700 dark:text-green-500 font-extrabold text-lg";
  }
  if (value > 100) {
    return "text-green-600 dark:text-green-400 font-bold text-lg";
  }
  if (value > 0) {
    return "text-green-500 dark:text-green-300 font-semibold text-lg";
  }
  // Neutral
  return "text-gray-500 dark:text-gray-300 font-semibold text-lg";
}

export default function AssetsPage() {
  const { data: portfolioAnalysis, error, isLoading } = usePortfolioAnalysis();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      router.push("/");
    }
  }, [error, router]);

  const assetsBreakdown = useAssetsBreakdown(portfolioAnalysis);

  if (isLoading || error) {
    return (
      <>
        <DiamondLoader />
        <p>loading your data...</p>
      </>
    );
  }

  return (
    <>
      {" "}
      <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4">
        <h2 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-gray-100">Assets breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200 rounded-xl overflow-hidden shadow-lg bg-white dark:bg-transparent">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800/80">
                <th className="px-4 py-3 font-semibold">Asset</th>
                <th className="px-4 py-3 font-semibold text-center">Profit/Loss ($)</th>
                <th className="px-4 py-3 font-semibold text-center">Profit/Loss from open positions ($)</th>
                <th className="px-4 py-3 font-semibold text-center">Potential Profit/Loss ($)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {assetsBreakdown.map((asset) => {
                return (
                  <tr
                    key={asset.stock}
                    className="hover:bg-gray-200 dark:hover:bg-slate-900/30 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 border-b border-gray-300 dark:border-slate-700 rounded-l-md">
                      {asset.stock}
                    </td>
                    <td
                      className={`px-4 py-3 border-b text-center border-gray-300 dark:border-slate-700 ${getProfitLossTextClass(asset.profitOrLoss)}`}
                    >
                      {asset.profitOrLoss.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 border-b text-center border-gray-300 dark:border-slate-700 ${getProfitLossTextClass(asset.openPositionsProfit)}`}
                    >
                      {asset.openPositionsProfit.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 border-b text-center border-gray-300 dark:border-slate-700 ${getProfitLossTextClass(asset.potentialValue)}`}
                    >
                      {asset.potentialValue.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 border-b  border-gray-300 dark:border-slate-700 rounded-r-md`}>
                      <Button variant={"secondary"} onClick={() => router.push("/assets/" + asset.stock)} size="icon">
                        <TrendingUp />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-100 dark:bg-slate-700/80 font-bold ">
                <td className="px-4 py-3 ">Total</td>
                <td className="px-4 py-3 text-center">
                  {assetsBreakdown.reduce((acc, stock) => stock.profitOrLoss + acc, 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {assetsBreakdown.reduce((acc, stock) => stock.openPositionsProfit + acc, 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {assetsBreakdown.reduce((acc, stock) => stock.potentialValue + acc, 0).toFixed(2)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
