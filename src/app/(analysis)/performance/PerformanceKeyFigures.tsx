"use client";
import React, { type PropsWithChildren } from "react";
import { useStore } from "@/lib/store";
import { redirect } from "next/navigation";
import { PortfolioAnalysis } from "@/xlsx-parser/types";
import { clsx } from "clsx";
import { profitOrLossTextColor } from "@/lib/utils";

const KeyFigureValue: React.FC<PropsWithChildren> = ({ children }) => {
  return <p className={"text-2xl text-white font-bold drop-shadow"}>{children}</p>;
};

function getProfitTextFromOpenPositions(
  assetsAnalysis: PortfolioAnalysis["assetsAnalysis"],
  stockPrices: PortfolioAnalysis["stockPrices"],
  windowStartDate: string,
  windowEndDate: string,
): number {
  let totalProfit = 0;

  Object.entries(assetsAnalysis).forEach(([symbol, asset]) => {
    asset.openPositions.forEach((pos) => {
      let priceAtStart;
      // Get price at window start
      const priceRecord = stockPrices[symbol]?.price;
      const priceAtEnd = priceRecord?.[windowEndDate];

      if (new Date(pos.date).getTime() > new Date(windowStartDate).getTime()) {
        // Position opened after window start, use position open date
        priceAtStart = priceRecord?.[pos.date];
      } else {
        priceAtStart = priceRecord?.[windowStartDate];
      }

      if (priceAtStart !== undefined && priceAtEnd !== undefined) {
        totalProfit += (priceAtEnd - priceAtStart) * pos.volume;
      }
    });
  });

  return totalProfit;
}

function ProfitText({
  portfolioAnalysis,
  windowSizes,
  totalBalance,
}: {
  portfolioAnalysis: PortfolioAnalysis;
  windowSizes: { label: string; daysAgo: number }[];
  totalBalance: number;
}) {
  const timeline = portfolioAnalysis.portfolioTimeline;
  const assetsAnalysis = portfolioAnalysis.assetsAnalysis;
  const stockPrices = portfolioAnalysis.stockPrices;

  const last = timeline.at(-1);
  if (!last) return null;

  return (
    <div className="flex flex-col text-xs text-gray-300 mt-2 space-y-0.5">
      {windowSizes.map(({ label, daysAgo }) => {
        const startIdx = timeline.length - 1 - daysAgo;
        if (startIdx < 0) return null;
        const startDate = timeline[startIdx].date;
        const endDate = last.date;
        const totalProfit = getProfitTextFromOpenPositions(assetsAnalysis, stockPrices, startDate, endDate);
        const percentage = totalBalance !== 0 ? (totalProfit / totalBalance) * 100 : 0;
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

export const PerformanceKeyFigures = () => {
  const { portfolioAnalysis } = useStore();

  if (!portfolioAnalysis) {
    redirect("/");
  }

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  if (!portfolioTimeline.length) {
    return null;
  }
  const last = portfolioTimeline.at(-1)!;
  const sp500ProfitOrLoss = last.sp500Value - last.balance;
  const sp500Percentage = last.balance !== 0 ? (sp500ProfitOrLoss / last.balance) * 100 : 0;
  const realizedProfitOrLoss = last.profitOrLoss;
  const realizedPercentage = last.balance !== 0 ? (realizedProfitOrLoss / last.balance) * 100 : 0;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl w-full flex-col flex flex-wrap lg:flex-row lg:justify-around">
      <div className="p-8 flex flex-col items-start">
        <strong className="text-white text-lg mb-2 drop-shadow">Total portfolio value</strong>
        <KeyFigureValue>${last.portfolioValue.toFixed(2)}</KeyFigureValue>
        <div className={"grid grid-cols-[auto_1fr] gap-x-4 mt-1"}>
          <p className="text-sm text-gray-200">{realizedProfitOrLoss > 0 ? "Cashed in: " : "Lost: "}</p>
          <span className={profitOrLossTextColor(realizedProfitOrLoss)}>
            ${realizedProfitOrLoss.toFixed(2)} ({realizedPercentage.toFixed(2)}%)
          </span>
          <p className="text-sm text-gray-200 mt-1">Open:</p>
          <ProfitText
            portfolioAnalysis={portfolioAnalysis}
            windowSizes={[
              { label: "Week", daysAgo: 7 },
              { label: "Month", daysAgo: 30 },
              { label: "Year", daysAgo: 365 },
            ]}
            totalBalance={last.portfolioValue}
          />
        </div>
      </div>
      <div className="p-8 flex flex-col items-start">
        <strong className="text-white text-lg mb-2 drop-shadow">Total value invested</strong>
        <KeyFigureValue>${last.balance.toFixed(2)}</KeyFigureValue>
      </div>
      <div className="p-8 flex flex-col items-start">
        <strong className="text-white text-lg mb-2 drop-shadow">If invested in SP500</strong>
        <KeyFigureValue>${last.sp500Value.toFixed(2)}</KeyFigureValue>
        <p className={"text-sm text-gray-200 mt-1"}>
          {sp500ProfitOrLoss >= 0 ? "Potential profit: " : "Potential loss: "}
          <span className={clsx("text-sm  mt-1", profitOrLossTextColor(sp500ProfitOrLoss))}>
            ${sp500ProfitOrLoss.toFixed(2)} ({sp500Percentage.toFixed(2)}%)
          </span>
        </p>
      </div>
    </div>
  );
};
