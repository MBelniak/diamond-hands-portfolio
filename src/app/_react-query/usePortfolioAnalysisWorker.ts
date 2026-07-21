import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { QueryKeys } from "@/app/_react-query/queryKeys";
import { analysePortfolioInWorker } from "@/client/analysis/analysePortfolioInWorker";
import { useStore } from "@/lib/store";
import { PortfolioData } from "@/lib/types";

export const usePortfolioAnalysisWorker = (portfolioDataQuery: UseQueryResult<PortfolioData>) => {
  const { selectedPortfolio } = useStore();
  const { data: portfolioData } = portfolioDataQuery;

  return useQuery({
    queryKey: [QueryKeys.PORTFOLIO_ANALYSIS_QUERY_KEY, selectedPortfolio, portfolioDataQuery.dataUpdatedAt],
    queryFn: ({ signal }) => {
      if (!portfolioData) {
        throw new Error("Portfolio data is not available.");
      }

      return analysePortfolioInWorker(portfolioData, signal);
    },
    enabled: !!portfolioData,
    staleTime: Infinity,
    retry: false,
    refetchOnMount: false,
    retryOnMount: false,
  });
};
