"use client";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { QueryKeys } from "@/app/_react-query/queryKeys";
import { PortfolioAnalysis, PortfolioData } from "@/lib/types";
import { analysePortfolio } from "@/lib/analysis/analysePortfolio";
import { portfolioDataDB } from "@/lib/utils";

export const usePortfolioAnalysis = (): UseQueryResult<PortfolioAnalysis | null> => {
  return useQuery({
    queryKey: [QueryKeys.PORTFOLIO_ANALYSIS_QUERY_KEY],
    queryFn: async () => {
      const cachedData = await portfolioDataDB.getPortfolioData();
      if (cachedData) {
        return analysePortfolio(cachedData);
      }
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const data = (await res.json()) as PortfolioData | null;
      if (data) {
        await portfolioDataDB.setPortfolioData(data);
        return analysePortfolio(data);
      }
      return null;
    },
    staleTime: Infinity,
  });
};
