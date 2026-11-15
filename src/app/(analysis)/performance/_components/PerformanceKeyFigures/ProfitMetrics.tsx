import { PortfolioCurrencyToSymbol } from "@/lib/types";
import { formatMoney, formatPercent, getProfitLossClass } from "@/lib/utils";
import React from "react";
import { useStore } from "@/lib/store";
import { TimePeriod, timePeriodEnumToLabel } from "@/app/(analysis)/performance/_types/TimePeriod";
import { ReturnMetricsOnBenchmark } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";
import { MetricRow } from "./KeyFigure";

export function ProfitMetrics({ returns }: { returns: ReturnMetricsOnBenchmark }) {
  const { selectedPortfolio } = useStore();
  const currencySymbol = PortfolioCurrencyToSymbol[selectedPortfolio];

  return (
    <dl className="divide-border/60 mt-1 w-full divide-y">
      {Object.keys(returns).map((period) => {
        const label = timePeriodEnumToLabel[period as TimePeriod];
        const { totalProfit } = returns[period as TimePeriod];
        const percentage = returns[period as TimePeriod].return;
        return (
          <MetricRow
            key={label}
            label={label}
            valueClassName={getProfitLossClass(totalProfit)}
            value={
              <>
                {formatMoney(totalProfit, currencySymbol, { signed: true })}
                <span className="ml-2 inline-block min-w-16 text-right opacity-80">
                  {formatPercent(percentage, { signed: true })}
                </span>
              </>
            }
          />
        );
      })}
    </dl>
  );
}
