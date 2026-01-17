"use client";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { QueryKeys } from "@/app/_react-query/queryKeys";
import { PortfolioAnalysis, PortfolioData } from "@/lib/types";
import { analysePortfolio } from "@/lib/analysis/analysePortfolio";
import { useStore } from "@/lib/store";
import { portfolioDataDB } from "@/app/indexedDB/portfolioDataDB";

export const usePortfolioAnalysis = (): UseQueryResult<PortfolioAnalysis | null> => {
  const { selectedBenchmark, selectedPortfolio } = useStore();
  return useQuery({
    queryKey: [QueryKeys.PORTFOLIO_ANALYSIS_QUERY_KEY, selectedBenchmark, selectedPortfolio],
    queryFn: async () => {
      const cachedData = await portfolioDataDB.getPortfolioData(selectedPortfolio);
      if (cachedData) {
        return analysePortfolio(cachedData, selectedBenchmark);
      }
      const res = await fetch("/api/portfolio?selectedPortfolio=" + selectedPortfolio);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const data = (await res.json()) as PortfolioData | null;
      if (data) {
        // Ignore if save to DB fails
        portfolioDataDB.setPortfolioData(data, selectedPortfolio).then();
        return analysePortfolio(data, selectedBenchmark);
      }
      throw new Error("Portfolio does not exists for this user");
    },
    staleTime: Infinity,
    retry: false,
    refetchOnMount: false,
    retryOnMount: false,
  });
};
