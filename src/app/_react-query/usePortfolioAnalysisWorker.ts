import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { QueryKeys } from "@/app/_react-query/queryKeys";
import { analysePortfolioInWorker } from "@/client/analysis/analysePortfolioInWorker";
import { useStore } from "@/lib/store";
import { PortfolioData } from "@/lib/types";
import { useDeferredValue } from "react";

export const usePortfolioAnalysisWorker = (portfolioDataQuery: UseQueryResult<PortfolioData>) => {
  const { selectedPortfolio, demoMode } = useStore();
  const { data: portfolioData } = portfolioDataQuery;

  const { data, ...rest } = useQuery({
    queryKey: [QueryKeys.PORTFOLIO_ANALYSIS_QUERY_KEY, selectedPortfolio, demoMode, portfolioDataQuery.dataUpdatedAt],
    queryFn: async ({ signal }) => {
      if (!portfolioData) {
        throw new Error("Portfolio data is not available.");
      }

      return await analysePortfolioInWorker(portfolioData, signal);
    },
    enabled: !!portfolioData,
    staleTime: Infinity,
    retry: false,
    refetchOnMount: false,
    retryOnMount: false,
  });

  const deferredData = useDeferredValue(data);

  return { data: deferredData, ...rest };
};
