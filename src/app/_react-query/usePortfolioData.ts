"use client";

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { portfolioDataDB } from "@/client/indexedDB/portfolioDataDB";
import { PortfolioData } from "@/lib/types";
import { useDeferredValue } from "react";
import { QueryKeys } from "@/app/_react-query/queryKeys";

export const usePortfolioData = (): UseQueryResult<PortfolioData> => {
  const { selectedPortfolio, demoMode } = useStore();

  const { data, ...rest } = useQuery({
    queryKey: [QueryKeys.PORTFOLIO_DATA_QUERY_KEY, selectedPortfolio, demoMode],
    queryFn: async () => {
      if (!demoMode) {
        const cachedData = await portfolioDataDB.getPortfolioData(selectedPortfolio);
        if (cachedData) {
          return cachedData;
        }
      }

      const params = new URLSearchParams();
      params.set("selectedPortfolio", selectedPortfolio);
      if (demoMode) {
        params.set("demoData", "true");
      }
      const res = await fetch("/api/portfolio?" + params.toString());

      if (!res.ok) throw new Error("Failed to fetch portfolio");

      const portfolioData = (await res.json()) as PortfolioData | null;
      if (portfolioData) {
        if (!demoMode) {
          portfolioDataDB.setPortfolioData(portfolioData, selectedPortfolio).then();
        }
        return portfolioData;
      }
      throw new Error("Portfolio does not exist for this user");
    },
    staleTime: Infinity,
    retry: false,
    refetchOnMount: false,
    retryOnMount: false,
  });

  const deferredData = useDeferredValue(data);

  return { data: deferredData, ...rest } as UseQueryResult<PortfolioData>;
};
