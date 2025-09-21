"use client";
import React, { type PropsWithChildren } from "react";
import { useStore } from "@/lib/store";
import { redirect } from "next/navigation";

const KeyFigureValue: React.FC<PropsWithChildren> = ({ children }) => {
  return <p className={"text-2xl text-white font-bold drop-shadow"}>{children}</p>;
};

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
      </div>
      <div className="p-8 flex flex-col items-start">
        <strong className="text-white text-lg mb-2 drop-shadow">Total value invested</strong>
        <KeyFigureValue>${portfolioTimeline.at(-1)?.balance.toFixed(2)}</KeyFigureValue>
      </div>
      <div className="p-8 flex flex-col items-start">
        <strong className="text-white text-lg mb-2 drop-shadow">If invested in SP500</strong>
        <KeyFigureValue>${portfolioTimeline.at(-1)?.sp500Value.toFixed(2)}</KeyFigureValue>
      </div>
    </div>
  );
};
