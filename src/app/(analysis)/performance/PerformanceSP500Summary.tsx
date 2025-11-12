"use client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleQuestionMark } from "lucide-react";
import { clsx } from "clsx";
import { profitOrLossTextColor } from "@/lib/utils";
import React from "react";
import { useStore } from "@/lib/store";
import { PortfolioAnalysis } from "@/lib/types";
import { ProfitMetrics } from "@/app/(analysis)/performance/ProfitMetrics";
import { calculateMWR, calculateTWR, getCashFlowForBenchmarkComparison } from "@/lib/returnMetrics";
import { BenchmarkIndexToName } from "@/lib/benchmarks";

export const PerformanceSP500Summary: React.FC<{
  portfolioAnalysis: PortfolioAnalysis;
}> = ({ portfolioAnalysis }) => {
  const { selectedReturnMetric, selectedBenchmark } = useStore();

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  const last = portfolioTimeline.at(-1)!;
  const sp500ProfitOrLoss = last.benchmarkStockValue - last.totalCapitalInvested;
  const valueTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
    ...el,
    value: el.benchmarkStockValue,
    oneDayProfit: el.benchmarkOneDayProfit,
  }));
  const cashFlow = getCashFlowForBenchmarkComparison(portfolioAnalysis.cashFlow);

  const sp500Percentage = {
    SR: (last.totalCapitalInvested != 0 ? sp500ProfitOrLoss / last.totalCapitalInvested : 0) * 100,
    TWR: calculateTWR(valueTimeline, portfolioAnalysis.portfolioTimeline.length - 1) * 100,
    MWR: calculateMWR(valueTimeline, cashFlow, portfolioAnalysis.portfolioTimeline.length - 1) * 100,
  };

  return (
    <div className="p-8 flex flex-col items-start">
      <strong className=" text-lg ">
        If invested in {BenchmarkIndexToName[selectedBenchmark]}{" "}
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark size={20} />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <p>If invested all deposited cash into S&P 500 index without withdrawals</p>
          </TooltipContent>
        </Tooltip>
      </strong>
      <p className={"text-2xl  font-bold"}>${last.benchmarkStockValue.toFixed(2)}</p>
      <p className={"text-sm  text-gray-800 dark:text-gray-200 mt-2"}>
        {sp500ProfitOrLoss >= 0 ? "Potential profit: " : "Potential loss: "}
        <span className={clsx("text-sm  mt-1", profitOrLossTextColor(sp500ProfitOrLoss))}>
          ${sp500ProfitOrLoss.toFixed(2)} ({sp500Percentage[selectedReturnMetric].toFixed(2)}%)
        </span>
      </p>
      <ProfitMetrics
        cashFlow={cashFlow}
        timeline={valueTimeline}
        totalCapitalInvested={portfolioAnalysis.portfolioTimeline.at(-1)!.totalCapitalInvested}
        windowSizes={[
          { label: "Week", daysAgo: 7 },
          { label: "Month", daysAgo: 30 },
          { label: "3M", daysAgo: 90 },
          { label: "6M", daysAgo: 180 },
          { label: "Year", daysAgo: 365 },
        ]}
        returnMetric={selectedReturnMetric}
      />
      <strong className="text-md mt-4">P & L breakdown</strong>
      <p>TODO</p>
    </div>
  );
};
