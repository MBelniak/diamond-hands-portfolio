"use client";
import React from "react";
import { PortfolioValueSummary } from "@/app/(analysis)/performance/PortfolioValueSummary";
import { PortfolioCapitalSummary } from "@/app/(analysis)/performance/PortfolioCapitalSummary";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { PortfolioAnalysis } from "@/lib/xlsx-parser/types";
import { PerformanceSP500Summary } from "@/app/(analysis)/performance/PerformanceSP500Summary";

export const PerformanceKeyFigures = () => {
  const { data } = usePortfolioAnalysis();
  const portfolioAnalysis = data as PortfolioAnalysis;

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  if (!portfolioTimeline.length) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl w-full flex-col flex flex-wrap lg:flex-row lg:justify-around">
      <PortfolioValueSummary portfolioAnalysis={portfolioAnalysis} />
      <PortfolioCapitalSummary portfolioAnalysis={portfolioAnalysis} />
      <PerformanceSP500Summary portfolioAnalysis={portfolioAnalysis} />
    </div>
  );
};
