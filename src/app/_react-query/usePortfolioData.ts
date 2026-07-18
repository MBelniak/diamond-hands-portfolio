"use client";

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { portfolioDataDB } from "@/client/indexedDB/portfolioDataDB";
import { PortfolioData } from "@/lib/types";
import { useDeferredValue } from "react";

export const usePortfolioData = (): UseQueryResult<PortfolioData> => {
  const { selectedPortfolio } = useStore();

  const { data, ...rest } = useQuery({
    queryKey: ["portfolioData", selectedPortfolio],
    queryFn: async () => {
      const cachedData = await portfolioDataDB.getPortfolioData(selectedPortfolio);
      if (cachedData) {
        return cachedData;
      }
      const res = await fetch("/api/portfolio?selectedPortfolio=" + selectedPortfolio);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const portfolioData = (await res.json()) as PortfolioData | null;
      if (portfolioData) {
        portfolioDataDB.setPortfolioData(portfolioData, selectedPortfolio).then();
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
