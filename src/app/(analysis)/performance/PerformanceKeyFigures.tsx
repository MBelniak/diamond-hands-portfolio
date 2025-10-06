"use client";
import React, { type PropsWithChildren } from "react";
import { useStore } from "@/lib/store";
import { redirect } from "next/navigation";
import { PortfolioValue } from "@/xlsx-parser/types";

const KeyFigureValue: React.FC<PropsWithChildren> = ({ children }) => {
  return <p className={"text-2xl text-white font-bold drop-shadow"}>{children}</p>;
};

function getProfitText(timeline: PortfolioValue[], valueKey: "portfolioValue" | "sp500Value", balanceKey: "balance") {
  const last = timeline.at(-1);
  if (!last) return null;

  const weekAgo = timeline.at(-7);
  const monthAgo = timeline.at(-30);
  const invested = last[balanceKey];

  function profitStr(from: PortfolioValue | undefined, label: string) {
    if (!from) return null;
    const abs = last![valueKey] - from[valueKey];
    const pct = invested ? (abs / invested) * 100 : 0;
    return (
      <span>
        {label}: {abs >= 0 ? "+" : ""}
        {abs.toFixed(2)} USD ({pct >= 0 ? "+" : ""}
        {pct.toFixed(2)}%)
      </span>
    );
  }

  return (
    <div className="text-xs text-gray-300 mt-2 space-y-0.5">
      {profitStr(weekAgo, "Week")}
      <br />
      {profitStr(monthAgo, "Month")}
      <br />
      {profitStr(timeline[0], "All")}
    </div>
  );
}

export const PerformanceKeyFigures = () => {
  const { portfolioAnalysis } = useStore();

  if (!portfolioAnalysis) {
    redirect("/");
  }

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl w-full flex-col flex flex-wrap lg:flex-row lg:justify-around">
      <div className="p-8 flex flex-col items-start">
        <strong className="text-white text-lg mb-2 drop-shadow">Total portfolio value</strong>
        <KeyFigureValue>${portfolioTimeline.at(-1)?.portfolioValue.toFixed(2)}</KeyFigureValue>
        <p className="text-sm text-gray-200">
          {portfolioTimeline.at(-1)!.profitOrLoss > 0 ? "Realized profit: " : "Realized loss: "} $
          {portfolioTimeline.at(-1)!.profitOrLoss.toFixed(2)}
        </p>
        {getProfitText(portfolioTimeline, "portfolioValue", "balance")}
      </div>
      <div className="p-8 flex flex-col items-start">
        <strong className="text-white text-lg mb-2 drop-shadow">Total value invested</strong>
        <KeyFigureValue>${portfolioTimeline.at(-1)?.balance.toFixed(2)}</KeyFigureValue>
      </div>
      <div className="p-8 flex flex-col items-start">
        <strong className="text-white text-lg mb-2 drop-shadow">If invested in SP500</strong>
        <KeyFigureValue>${portfolioTimeline.at(-1)?.sp500Value.toFixed(2)}</KeyFigureValue>
        {getProfitText(portfolioTimeline, "sp500Value", "balance")}
      </div>
    </div>
  );
};
