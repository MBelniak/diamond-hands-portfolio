import { create } from "zustand";
import { PortfolioAnalysis } from "@/xlsx-parser/types";

interface Store {
  portfolioAnalysis: PortfolioAnalysis | null;
  setPortfolioAnalysis: (data: PortfolioAnalysis) => void;
}

export const useStore = create<Store>((set) => ({
  portfolioAnalysis: null,
  setPortfolioAnalysis: (data: PortfolioAnalysis) => {
    set({ portfolioAnalysis: data });
  },
}));
