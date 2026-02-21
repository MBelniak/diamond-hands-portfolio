"use client";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { QueryKeys } from "@/app/_react-query/queryKeys";
import { PortfolioAnalysis, PortfolioData } from "@/lib/types";
import { analysePortfolio } from "@/lib/analysis/analysePortfolio";
import { useStore } from "@/lib/store";
import { portfolioDataDB } from "@/app/indexedDB/portfolioDataDB";
import { useDeferredValue } from "react";

export const usePortfolioAnalysis = (): UseQueryResult<PortfolioAnalysis> & { isDataStale: boolean } => {
  const { selectedPortfolio } = useStore();
  const { data, ...useQueryResult } = useQuery({
    queryKey: [QueryKeys.PORTFOLIO_ANALYSIS_QUERY_KEY, selectedPortfolio],
    queryFn: async () => {
      const cachedData = await portfolioDataDB.getPortfolioData(selectedPortfolio);
      if (cachedData) {
        return analysePortfolio(cachedData);
      }
      const res = await fetch("/api/portfolio?selectedPortfolio=" + selectedPortfolio);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const data = (await res.json()) as PortfolioData | null;
      if (data) {
        // Ignore if save to DB fails
        portfolioDataDB.setPortfolioData(data, selectedPortfolio).then();
        return analysePortfolio(data);
      }
      throw new Error("Portfolio does not exists for this user");
    },
    staleTime: Infinity,
    retry: false,
    refetchOnMount: false,
    retryOnMount: false,
  });

  const deferredData = useDeferredValue(data);

  return {
    data: deferredData,
    isDataStale: data !== deferredData,
    ...useQueryResult,
  } as UseQueryResult<PortfolioAnalysis> & { isDataStale: boolean };
};
