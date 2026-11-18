"use client";

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { portfolioDataDB } from "@/client/indexedDB/portfolioDataDB";
import { PortfolioData, PortfolioEventsResponse } from "@/lib/types";
import { QueryKeys } from "@/app/_react-query/queryKeys";
import { fetchStockMarketData } from "@/client/marketData/fetchMarketData";

export const usePortfolioData = (): UseQueryResult<PortfolioData> => {
  const { selectedPortfolio, demoMode } = useStore();

  return useQuery({
    queryKey: [QueryKeys.PORTFOLIO_DATA_QUERY_KEY, selectedPortfolio, demoMode],
    queryFn: async ({ signal }) => {
      if (!demoMode) {
        const cachedData = await portfolioDataDB.getPortfolioData(selectedPortfolio);
        if (cachedData) {
          return cachedData;
        }
      }

      const params = new URLSearchParams();
      params.set("selectedPortfolio", selectedPortfolio);
      const res = await fetch("/api/portfolio?" + params.toString(), { signal });

      if (!res.ok) throw new Error("Failed to fetch portfolio");

      const portfolioEventsResponse = (await res.json()) as PortfolioEventsResponse | null;
      if (!portfolioEventsResponse) {
        throw new Error("Portfolio does not exist for this user");
      }

      // Market data isn't user-specific, so it comes from a separate endpoint, in one bulk request
      const stockMarketData = await fetchStockMarketData(portfolioEventsResponse.tickers, selectedPortfolio, signal);
      const portfolioData: PortfolioData = {
        portfolioEvents: portfolioEventsResponse.portfolioEvents,
        stockMarketData,
      };

      if (!demoMode) {
        portfolioDataDB.setPortfolioData(portfolioData, selectedPortfolio).then();
      }
      return portfolioData;
    },
    staleTime: Infinity,
    retry: false,
    refetchOnMount: false,
    retryOnMount: false,
  });
};
