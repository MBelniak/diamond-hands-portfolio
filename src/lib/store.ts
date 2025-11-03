import { create } from "zustand";
import { PortfolioAnalysis } from "@/xlsx-parser/types";
import { ReturnMetric } from "@/lib/return-metrics";

interface Store {
  portfolioAnalysis: PortfolioAnalysis | null;
  setPortfolioAnalysis: (data: PortfolioAnalysis) => void;
  selectedReturnMetric: ReturnMetric;
  setSelectedReturnMetric: (data: ReturnMetric) => void;
}

export const useStore = create<Store>((set) => ({
  portfolioAnalysis: null,
  setPortfolioAnalysis: (data: PortfolioAnalysis) => {
    set({ portfolioAnalysis: data });
  },
  selectedReturnMetric: "SR",
  setSelectedReturnMetric: (data: ReturnMetric) => {
    set({ selectedReturnMetric: data });
  },
}));
