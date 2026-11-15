"use client";
import { formatMoney, formatPercent, getProfitLossClass } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InfoTooltip, StatLabel, StatValue } from "./KeyFigure";
import React from "react";
import { useStore } from "@/lib/store";
import { PortfolioAnalysis, PortfolioCurrencyToSymbol } from "@/lib/types";
import { BenchmarkComparison } from "./BenchmarkComparison";
import { BenchmarkIndexToName } from "@/lib/benchmarks";
import Link from "next/link";
import { getReturnOnTimeline } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";
import { getCashFlowForBenchmarkComparison } from "@/lib/returnMetrics";

export const PerformanceBenchmarkIndexSummary: React.FC<{
  portfolioAnalysis: PortfolioAnalysis;
}> = ({ portfolioAnalysis }) => {
  const { selectedReturnMetric, selectedBenchmark, selectedPortfolio } = useStore();

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  const last = portfolioTimeline.at(-1)!;

  const totalCapitalInvested = last.totalCapitalInvested;
  const benchmarkProfitOrLoss = last.benchmarkData[selectedBenchmark].stockValue - totalCapitalInvested;

  const benchmarkTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
    ...el,
    value: el.benchmarkData[selectedBenchmark].stockValue,
    oneDayProfit: el.benchmarkData[selectedBenchmark].oneDayProfit,
  }));

  const benchmarkCashFlow = getCashFlowForBenchmarkComparison(portfolioAnalysis.cashFlow);

  const periods = [
    TimePeriod.All,
    TimePeriod.OneWeek,
    TimePeriod.OneMonth,
    TimePeriod.ThreeMonths,
    TimePeriod.SixMonths,
    TimePeriod.OneYear,
  ];

  const returnOnBenchmark = getReturnOnTimeline(
    benchmarkTimeline,
    benchmarkCashFlow,
    totalCapitalInvested,
    periods,
    selectedReturnMetric,
  );

  // Portfolio return over the same periods, shown next to the benchmark as "(vs. x%)"
  const returnOnPortfolio = getReturnOnTimeline(
    portfolioTimeline.map((el) => ({ ...el, value: el.portfolioValue })),
    portfolioAnalysis.cashFlow,
    totalCapitalInvested,
    periods,
    selectedReturnMetric,
  );

  const currencySymbol = PortfolioCurrencyToSymbol[selectedPortfolio];
  const benchmarkName = BenchmarkIndexToName[selectedBenchmark];

  return (
    <Card>
      <CardHeader
        title={
          <>
            If invested in
            <Link
              href={`/assets/${selectedBenchmark}`}
              className="decoration-muted-foreground/60 hover:decoration-foreground underline underline-offset-4 transition-colors"
            >
              {benchmarkName}
            </Link>
            <InfoTooltip>If invested all deposited cash into {benchmarkName} index without withdrawals</InfoTooltip>
          </>
        }
      />
      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <StatValue size="md">
            {formatMoney(last.benchmarkData[selectedBenchmark].stockValue, currencySymbol)}
          </StatValue>
          <p className="text-sm tabular-nums">
            <span className={getProfitLossClass(benchmarkProfitOrLoss)}>
              {formatMoney(returnOnBenchmark[TimePeriod.All].totalProfit, currencySymbol, { signed: true })} (
              {formatPercent(returnOnBenchmark[TimePeriod.All].return, { signed: true })})
            </span>
            <span className="text-muted-foreground ml-2">
              {benchmarkProfitOrLoss >= 0 ? "potential profit" : "potential loss"}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t pt-5">
          <StatLabel>Portfolio vs {benchmarkName}</StatLabel>
          <BenchmarkComparison
            benchmarkName={benchmarkName}
            periods={[...periods.filter((p) => p !== TimePeriod.All), TimePeriod.All]}
            benchmarkReturns={returnOnBenchmark}
            portfolioReturns={returnOnPortfolio}
          />
        </div>
      </CardContent>
    </Card>
  );
};
