import { useQuery } from "@tanstack/react-query";
import { portfolioAnalysisDB } from "../lib/utils";
import { PortfolioAnalysis } from "../xlsx-parser/types";

export function usePortfolioAnalysisQuery() {
  return useQuery<PortfolioAnalysis | null>({
    queryKey: ["portfolioAnalysis"],
    queryFn: async () => {
      const data = await portfolioAnalysisDB.getPortfolioAnalysis();
      return data ?? null;
    },
    staleTime: 0,
    gcTime: 0,
  });
}
