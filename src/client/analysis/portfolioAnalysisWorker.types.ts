import type { PortfolioAnalysis, PortfolioData } from "@/lib/types";

export type AnalysePortfolioWorkerRequest = {
  requestId: number;
  portfolioData: PortfolioData;
};

export type AnalysePortfolioWorkerResponse =
  | {
      requestId: number;
      analysis: PortfolioAnalysis;
    }
  | {
      requestId: number;
      error: string;
    };
