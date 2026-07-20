/// <reference lib="webworker" />

import { analysePortfolio } from "@/client/analysis/analysePortfolio";
import type {
  AnalysePortfolioWorkerRequest,
  AnalysePortfolioWorkerResponse,
} from "@/client/analysis/portfolioAnalysisWorker.types";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<AnalysePortfolioWorkerRequest>) => {
  const { requestId, portfolioData } = event.data;

  try {
    const response: AnalysePortfolioWorkerResponse = {
      requestId,
      analysis: analysePortfolio(portfolioData),
    };

    workerScope.postMessage(response);
  } catch (error) {
    const response: AnalysePortfolioWorkerResponse = {
      requestId,
      error: error instanceof Error ? error.message : "Portfolio analysis failed.",
    };

    workerScope.postMessage(response);
  }
};

export {};
