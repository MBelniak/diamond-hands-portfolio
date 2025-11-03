import { PortfolioAnalysis } from "@/xlsx-parser/types";
import {
  calculateMWR,
  calculateSimpleReturn,
  calculateTWR,
  getProfitFromOpenPositions,
  ReturnMetric,
} from "@/lib/return-metrics";
import { profitOrLossTextColor } from "@/lib/utils";
import React from "react";
import { addDays } from "date-fns/addDays";

export function ProfitMetrics({
  portfolioAnalysis,
  windowSizes,
  returnMetric,
}: {
  portfolioAnalysis: PortfolioAnalysis;
  windowSizes: { label: string; daysAgo: number }[];
  returnMetric: ReturnMetric;
}) {
  const timeline = portfolioAnalysis.portfolioTimeline;

  const last = timeline.at(-1);
  if (!last) return null;

  return (
    <div className="flex flex-col text-xs dark:text-gray-200 mt-1 space-y-0.5">
      {windowSizes.map(({ label, daysAgo }) => {
        const returnM = {
          SR: calculateSimpleReturn(portfolioAnalysis, daysAgo) * 100,
          TWR: calculateTWR(portfolioAnalysis.portfolioTimeline, daysAgo) * 100,
          MWR: calculateMWR(portfolioAnalysis.portfolioTimeline, portfolioAnalysis.cashFlow, daysAgo) * 100,
        };
        const totalProfit = getProfitFromOpenPositions(
          portfolioAnalysis.cashFlow,
          timeline,
          addDays(new Date(), -daysAgo),
          new Date(),
        );
        const percentage = returnM[returnMetric];

        return (
          <div key={label} className={"flex gap-1"}>
            <span>{label}:</span>
            <span className={profitOrLossTextColor(totalProfit)}>
              ${totalProfit.toFixed(2)} ({percentage.toFixed(2)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
