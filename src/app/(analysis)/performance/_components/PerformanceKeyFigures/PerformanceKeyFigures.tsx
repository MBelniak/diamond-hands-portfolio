"use client";
import React from "react";
import { PortfolioValueSummary } from "@/app/(analysis)/performance/_components/PerformanceKeyFigures/PortfolioValueSummary";
import { PortfolioCapitalSummary } from "@/app/(analysis)/performance/_components/PerformanceKeyFigures/PortfolioCapitalSummary";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { PortfolioAnalysis } from "@/lib/types";
import { PerformanceBenchmarkIndexSummary } from "@/app/(analysis)/performance/_components/PerformanceKeyFigures/PerformanceBenchmarkIndexSummary";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";

export const PerformanceKeyFigures = () => {
  const { data, isDataStale } = usePortfolioAnalysis();
  const portfolioAnalysis = data as PortfolioAnalysis;

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  if (!portfolioTimeline.length) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-sm shadow-xl w-full flex-col flex flex-wrap lg:flex-row lg:justify-around relative">
      {isDataStale && <LoaderOverlay />}
      <PortfolioValueSummary portfolioAnalysis={portfolioAnalysis} />
      <PortfolioCapitalSummary portfolioAnalysis={portfolioAnalysis} />
      <PerformanceBenchmarkIndexSummary portfolioAnalysis={portfolioAnalysis} />
    </div>
  );
};
