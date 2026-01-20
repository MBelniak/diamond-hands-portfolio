import { getProfitLossClass } from "@/lib/utils";
import { clsx } from "clsx";
import React, { type PropsWithChildren } from "react";
import { PortfolioAnalysis, PortfolioCurrencyToSymbol } from "@/lib/types";
import { ProfitMetrics } from "./ProfitMetrics";
import { useStore } from "@/lib/store";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";
import { getReturnOnTimeline, ReturnMetricsOnBenchmark } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";
import { omit } from "lodash-es";

const MainFigureValue: React.FC<PropsWithChildren> = ({ children }) => {
  return <p className={"text-4xl font-bold"}>{children}</p>;
};

export const PortfolioValueSummary: React.FC<{
  portfolioAnalysis: PortfolioAnalysis;
}> = ({ portfolioAnalysis }) => {
  const { selectedReturnMetric, useWithdrawnCash, selectedPortfolio } = useStore();
  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  if (!portfolioTimeline.length) {
    return null;
  }

  const last = portfolioTimeline.at(-1)!;
  const totalCapitalInvested = last.totalCapitalInvested;

  const realizedProfitOrLoss = last.profitOrLoss;

  const totalPortfolioValue = useWithdrawnCash
    ? last.portfolioValue + (totalCapitalInvested - last.balance)
    : last.portfolioValue;

  const valueTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
    ...el,
    value: el.portfolioValue,
  }));
  const realizedPercentage = last.balance !== 0 ? (realizedProfitOrLoss / totalCapitalInvested) * 100 : 0;

  const returnOnPortfolio = getReturnOnTimeline(
    valueTimeline,
    portfolioAnalysis.cashFlow,
    totalCapitalInvested,
    [
      TimePeriod.OneWeek,
      TimePeriod.OneMonth,
      TimePeriod.ThreeMonths,
      TimePeriod.SixMonths,
      TimePeriod.OneYear,
      TimePeriod.All,
    ],
    selectedReturnMetric,
  );

  const totalProfit = returnOnPortfolio[TimePeriod.All].totalProfit;

  return (
    <div className="p-8 flex flex-col items-start">
      <strong className=" text-lg mb-2">Total portfolio value</strong>
      <MainFigureValue>
        {PortfolioCurrencyToSymbol[selectedPortfolio]}
        {totalPortfolioValue.toFixed(2)}
      </MainFigureValue>
      <div className={"grid grid-cols-[auto_1fr] gap-x-4 mt-3"}>
        <p className="text-sm text-gray-800 dark:text-gray-200">
          {totalProfit > 0 ? "Total profit: " : "Total loss: "}
        </p>
        <span className={clsx(getProfitLossClass(totalProfit), "text-end")}>
          {PortfolioCurrencyToSymbol[selectedPortfolio]}
          {totalProfit.toFixed(2)} ({returnOnPortfolio[TimePeriod.All].return.toFixed(2)}%)
        </span>
        <p className="text-sm  text-gray-800 dark:text-gray-200">{"Cashed in: "}</p>
        <span className={clsx(getProfitLossClass(realizedProfitOrLoss), "text-end")}>
          {PortfolioCurrencyToSymbol[selectedPortfolio]}
          {realizedProfitOrLoss.toFixed(2)} ({realizedPercentage.toFixed(2)}%)
        </span>
        <p className="text-sm  text-gray-800 dark:text-gray-200">Open:</p>
        <ProfitMetrics returns={omit(returnOnPortfolio, [TimePeriod.All]) as ReturnMetricsOnBenchmark} />
      </div>
    </div>
  );
};
