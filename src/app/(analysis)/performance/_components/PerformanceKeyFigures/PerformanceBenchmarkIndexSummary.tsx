"use client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleQuestionMark } from "lucide-react";
import { clsx } from "clsx";
import { getProfitLossClass } from "@/lib/utils";
import React from "react";
import { useStore } from "@/lib/store";
import { PortfolioAnalysis, PortfolioCurrencyToSymbol } from "@/lib/types";
import { ProfitMetrics } from "@/app/(analysis)/performance/_components/PerformanceKeyFigures/ProfitMetrics";
import { BenchmarkIndexToName } from "@/lib/benchmarks";
import Link from "next/link";
import { getReturnOnTimeline, ReturnMetricsOnBenchmark } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";
import { omit } from "lodash-es";
import { getCashFlowForBenchmarkComparison } from "@/lib/returnMetrics";

export const PerformanceBenchmarkIndexSummary: React.FC<{
  portfolioAnalysis: PortfolioAnalysis;
}> = ({ portfolioAnalysis }) => {
  const { selectedReturnMetric, selectedBenchmark, selectedPortfolio } = useStore();

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  const last = portfolioTimeline.at(-1)!;

  const totalCapitalInvested = last.totalCapitalInvested;
  const benchmarkProfitOrLoss = last.benchmarkStockValue[selectedBenchmark] - totalCapitalInvested;

  const benchmarkTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
    ...el,
    value: el.benchmarkStockValue[selectedBenchmark],
    oneDayProfit: el.benchmarkOneDayProfit[selectedBenchmark],
  }));

  const benchmarkCashFlow = getCashFlowForBenchmarkComparison(portfolioAnalysis.cashFlow);

  const returnOnBenchmark = getReturnOnTimeline(
    benchmarkTimeline,
    benchmarkCashFlow,
    totalCapitalInvested,
    [
      TimePeriod.All,
      TimePeriod.OneWeek,
      TimePeriod.OneMonth,
      TimePeriod.ThreeMonths,
      TimePeriod.SixMonths,
      TimePeriod.OneYear,
    ],
    selectedReturnMetric,
  );

  return (
    <div className="p-8 flex flex-col items-start">
      <strong className=" text-lg ">
        If invested in{" "}
        <Link href={`/assets/${selectedBenchmark}`} className={"underline"}>
          {BenchmarkIndexToName[selectedBenchmark]}
        </Link>{" "}
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark size={20} />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <p>
              If invested all deposited cash into {BenchmarkIndexToName[selectedBenchmark]} index without withdrawals
            </p>
          </TooltipContent>
        </Tooltip>
      </strong>
      <p className={"text-2xl font-bold"}>
        {PortfolioCurrencyToSymbol[selectedPortfolio]}
        {last.benchmarkStockValue[selectedBenchmark].toFixed(2)}
      </p>
      <p className={"text-sm text-gray-800 dark:text-gray-200 mt-2 w-full flex justify-between"}>
        {benchmarkProfitOrLoss >= 0 ? "Potential profit: " : "Potential loss: "}
        <span className={clsx("text-sm", getProfitLossClass(benchmarkProfitOrLoss))}>
          {PortfolioCurrencyToSymbol[selectedPortfolio]}
          {returnOnBenchmark[TimePeriod.All].totalProfit.toFixed(2)} (
          {returnOnBenchmark[TimePeriod.All].return.toFixed(2)}%)
        </span>
      </p>
      <ProfitMetrics returns={omit(returnOnBenchmark, [TimePeriod.All]) as ReturnMetricsOnBenchmark} />
    </div>
  );
};
