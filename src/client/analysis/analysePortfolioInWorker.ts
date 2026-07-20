import type { PortfolioAnalysis, PortfolioData } from "@/lib/types";
import type {
  AnalysePortfolioWorkerRequest,
  AnalysePortfolioWorkerResponse,
} from "@/client/analysis/portfolioAnalysisWorker.types";

type PendingRequest = {
  resolve: (analysis: PortfolioAnalysis) => void;
  reject: (error: Error) => void;
};

let analysisWorker: Worker | null = null;
let nextRequestId = 0;
const pendingRequests = new Map<number, PendingRequest>();

const getAbortError = () => new DOMException("Portfolio analysis was cancelled.", "AbortError");

const rejectAllPendingRequests = (error: Error) => {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests.clear();
};

const resetAnalysisWorker = (error?: Error) => {
  if (analysisWorker) {
    analysisWorker.terminate();
    analysisWorker = null;
  }

  if (error) {
    rejectAllPendingRequests(error);
  }
};

const handleWorkerMessage = (event: MessageEvent<AnalysePortfolioWorkerResponse>) => {
  const response = event.data;
  const pendingRequest = pendingRequests.get(response.requestId);

  if (!pendingRequest) {
    return;
  }

  pendingRequests.delete(response.requestId);

  if ("error" in response) {
    pendingRequest.reject(new Error(response.error));
    return;
  }

  pendingRequest.resolve(response.analysis);
};

const getAnalysisWorker = (): Worker => {
  if (!analysisWorker) {
    analysisWorker = new Worker(new URL("./portfolioAnalysis.worker.ts", import.meta.url), {
      name: "portfolio-analysis-worker",
      type: "module",
    });

    analysisWorker.onmessage = handleWorkerMessage;
    analysisWorker.onerror = (event) => {
      resetAnalysisWorker(new Error(event.message || "Portfolio analysis worker failed."));
    };
  }

  return analysisWorker;
};

const runMainThreadFallback = async (portfolioData: PortfolioData): Promise<PortfolioAnalysis> => {
  const { analysePortfolio } = await import("@/client/analysis/analysePortfolio");
  return analysePortfolio(portfolioData);
};

export const analysePortfolioInWorker = async (
  portfolioData: PortfolioData,
  signal?: AbortSignal,
): Promise<PortfolioAnalysis> => {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return runMainThreadFallback(portfolioData);
  }

  const requestId = ++nextRequestId;
  const worker = getAnalysisWorker();

  return new Promise<PortfolioAnalysis>((resolve, reject) => {
    const cleanup = () => {
      pendingRequests.delete(requestId);
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleAbort = () => {
      cleanup();
      reject(getAbortError());
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    pendingRequests.set(requestId, {
      resolve: (analysis) => {
        cleanup();
        resolve(analysis);
      },
      reject: (error) => {
        cleanup();
        reject(error);
      },
    });

    signal?.addEventListener("abort", handleAbort, { once: true });

    const request: AnalysePortfolioWorkerRequest = {
      requestId,
      portfolioData,
    };

    worker.postMessage(request);
  });
};
