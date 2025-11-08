import { profitOrLossTextColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import { calculateMWR, calculateTWR, getProfitFromOpenPositions, ReturnMetric } from "@/lib/returnMetrics";
import React, { type PropsWithChildren } from "react";
import { PortfolioAnalysis } from "@/lib/xlsx-parser/types";
import { ProfitMetrics } from "./ProfitMetrics";
import { useStore } from "@/lib/store";

const MainFigureValue: React.FC<PropsWithChildren> = ({ children }) => {
  return <p className={"text-4xl font-bold"}>{children}</p>;
};

export const PortfolioValueSummary: React.FC<{
  portfolioAnalysis: PortfolioAnalysis;
}> = ({ portfolioAnalysis }) => {
  const { selectedReturnMetric, setSelectedReturnMetric } = useStore();
  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  if (!portfolioTimeline.length) {
    return null;
  }

  const last = portfolioTimeline.at(-1)!;

  const realizedProfitOrLoss = last.profitOrLoss;

  const totalProfitOrLoss = getProfitFromOpenPositions(
    portfolioAnalysis.cashFlow,
    portfolioAnalysis.portfolioTimeline,
    new Date(portfolioTimeline[0].date),
    new Date(last.date),
  );

  const realizedPercentage = last.balance !== 0 ? (realizedProfitOrLoss / last.totalCapitalInvested) * 100 : 0;
  const totalProfitPercentage = {
    SR: (last.totalCapitalInvested != 0 ? totalProfitOrLoss / last.totalCapitalInvested : 0) * 100,
    TWR: calculateTWR(portfolioAnalysis.portfolioTimeline, portfolioAnalysis.portfolioTimeline.length - 1) * 100,
    MWR:
      calculateMWR(
        portfolioAnalysis.portfolioTimeline,
        portfolioAnalysis.cashFlow,
        portfolioAnalysis.portfolioTimeline.length - 1,
      ) * 100,
  };

  return (
    <div className="p-8 flex flex-col items-start">
      <strong className=" text-lg mb-2">Total portfolio value</strong>
      <MainFigureValue>${last.portfolioValue.toFixed(2)}</MainFigureValue>
      <div className={"grid grid-cols-[auto_1fr] gap-x-4 mt-3"}>
        <p className="text-sm  text-gray-800 dark:text-gray-200">
          {totalProfitOrLoss > 0 ? "Total profit: " : "Total loss: "}
        </p>
        <span className={profitOrLossTextColor(totalProfitOrLoss)}>
          ${totalProfitOrLoss.toFixed(2)} ({totalProfitPercentage[selectedReturnMetric].toFixed(2)}%)
        </span>
        <p className="text-sm  text-gray-800 dark:text-gray-200">
          {realizedProfitOrLoss > 0 ? "Cashed in: " : "Lost: "}
        </p>
        <span className={profitOrLossTextColor(realizedProfitOrLoss)}>
          ${realizedProfitOrLoss.toFixed(2)} ({realizedPercentage.toFixed(2)}%)
        </span>
        <p className="text-sm  text-gray-800 dark:text-gray-200">Open:</p>
        <ProfitMetrics
          portfolioAnalysis={portfolioAnalysis}
          windowSizes={[
            { label: "Week", daysAgo: 7 },
            { label: "Month", daysAgo: 30 },
            { label: "Year", daysAgo: 365 },
          ]}
          returnMetric={selectedReturnMetric}
        />
      </div>
      <div className={"flex gap-1"}>
        {["SR", "MWR", "TWR"].map((metric) => (
          <Button
            key={metric}
            variant="link"
            className={clsx(selectedReturnMetric === metric && "font-bold underline")}
            onClick={() => {
              setSelectedReturnMetric(metric as ReturnMetric);
            }}
          >
            {metric}
          </Button>
        ))}
      </div>
    </div>
  );
};
