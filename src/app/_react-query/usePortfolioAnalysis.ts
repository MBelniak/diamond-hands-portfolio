"use client";
import { UseQueryResult } from "@tanstack/react-query";
import { PortfolioAnalysis } from "@/lib/types";
import { usePortfolioData } from "@/app/_react-query/usePortfolioData";
import { usePortfolioAnalysisWorker } from "@/app/_react-query/usePortfolioAnalysisWorker";

export const usePortfolioAnalysis = (): UseQueryResult<PortfolioAnalysis> & {
  isDataStale: boolean;
} => {
  const portfolioDataQuery = usePortfolioData();

  const analysisQuery = usePortfolioAnalysisWorker(portfolioDataQuery);

  const error = portfolioDataQuery.error ?? analysisQuery.error;
  const hasAnalysisData = !!analysisQuery.data;
  const isPending = portfolioDataQuery.isPending || (analysisQuery.isPending && !hasAnalysisData);
  const isLoading = portfolioDataQuery.isLoading || (analysisQuery.isLoading && !hasAnalysisData);
  const isFetching = (!hasAnalysisData && (portfolioDataQuery.isFetching || analysisQuery.isFetching)) || false;
  const isDataStale = hasAnalysisData && (portfolioDataQuery.isFetching || analysisQuery.isFetching);

  return {
    ...analysisQuery,
    data: analysisQuery.data,
    error,
    failureCount: error ? (portfolioDataQuery.failureCount ?? 0) + (analysisQuery.failureCount ?? 0) : 0,
    isError: !!error,
    isFetching,
    isLoading,
    isPending,
    isRefetching: isDataStale,
    isDataStale,
    refetch: portfolioDataQuery.refetch,
  } as unknown as UseQueryResult<PortfolioAnalysis> & { isDataStale: boolean };
};
