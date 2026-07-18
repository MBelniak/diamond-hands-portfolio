"use client";
import { UseQueryResult } from "@tanstack/react-query";
import { PortfolioAnalysis } from "@/lib/types";
import { analysePortfolio } from "@/client/analysis/analysePortfolio";
import { useMemo } from "react";
import { usePortfolioData } from "@/app/_react-query/usePortfolioData";

export const usePortfolioAnalysis = (): UseQueryResult<PortfolioAnalysis> & {
  isDataStale: boolean;
} => {
  const { data: portfolioData, ...rest } = usePortfolioData();

  const analysis = useMemo(() => (portfolioData ? analysePortfolio(portfolioData) : undefined), [portfolioData]);

  return {
    data: analysis,
    isDataStale: false,
    ...rest,
  } as unknown as UseQueryResult<PortfolioAnalysis> & { isDataStale: boolean };
};
