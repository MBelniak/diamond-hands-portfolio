import { CashFlow, TWRValueTimeline } from "@/lib/types";
import {
  calculateMWR,
  calculateSimpleReturn,
  calculateTWR,
  getProfitOrLossForPeriod,
  ReturnMetric,
} from "@/lib/returnMetrics";
import { profitOrLossTextColor } from "@/lib/utils";
import React from "react";
import { addDays } from "date-fns/addDays";

export function ProfitMetrics({
  cashFlow,
  timeline,
  totalCapitalInvested,
  windowSizes,
  returnMetric,
}: {
  cashFlow: CashFlow;
  timeline: TWRValueTimeline;
  totalCapitalInvested: number;
  windowSizes: { label: string; daysAgo: number }[];
  returnMetric: ReturnMetric;
}) {
  const last = timeline.at(-1);
  if (!last) return null;

  return (
    <div className="flex flex-col text-xs dark:text-gray-200 mt-1 space-y-0.5 w-full">
      {windowSizes.map(({ label, daysAgo }) => {
        const returnM = {
          SR: calculateSimpleReturn(timeline, cashFlow, totalCapitalInvested, daysAgo) * 100,
          TWR: calculateTWR(timeline, daysAgo) * 100,
          MWR: (calculateMWR(timeline, cashFlow, daysAgo) * 100) / (365 / daysAgo),
        };
        const totalProfit = getProfitOrLossForPeriod(cashFlow, timeline, addDays(new Date(), -daysAgo), new Date());
        const percentage = returnM[returnMetric];

        return (
          <div key={label} className={"flex gap-3 justify-between w-full"}>
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
