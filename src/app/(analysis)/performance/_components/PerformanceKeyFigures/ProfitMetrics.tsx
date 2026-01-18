import { PortfolioCurrencyToSymbol } from "@/lib/types";
import { getProfitLossClass } from "@/lib/utils";
import React from "react";
import { useStore } from "@/lib/store";
import { TimePeriod, timePeriodEnumToLabel } from "@/app/(analysis)/performance/_types/TimePeriod";
import { ReturnMetricsOnBenchmark } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";

export function ProfitMetrics({ returns }: { returns: ReturnMetricsOnBenchmark }) {
  const { selectedPortfolio } = useStore();

  return (
    <div className="flex flex-col text-xs dark:text-gray-200 mt-1 space-y-0.5 w-full">
      {Object.keys(returns).map((period) => {
        const label = timePeriodEnumToLabel[period as TimePeriod];
        const { totalProfit } = returns[period as TimePeriod];
        const percentage = returns[period as TimePeriod].return;
        return (
          <div key={label} className={"flex gap-3 justify-between w-full"}>
            <span>{label}:</span>
            <span className={getProfitLossClass(totalProfit)}>
              {PortfolioCurrencyToSymbol[selectedPortfolio]}
              {totalProfit.toFixed(2)} ({percentage.toFixed(2)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
