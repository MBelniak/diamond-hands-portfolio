"use client";
import { UseQueryResult } from "@tanstack/react-query";
import { PortfolioAnalysis } from "@/lib/types";
import { usePortfolioData } from "@/app/_react-query/usePortfolioData";
import { usePortfolioAnalysisWorker } from "@/app/_react-query/usePortfolioAnalysisWorker";

export const usePortfolioAnalysis = (): UseQueryResult<PortfolioAnalysis> => {
  const portfolioDataQuery = usePortfolioData();

  const analysisQuery = usePortfolioAnalysisWorker(portfolioDataQuery);

  const error = portfolioDataQuery.error ?? analysisQuery.error;
  const hasAnalysisData = !!analysisQuery.data;
  const isPending = portfolioDataQuery.isPending || (analysisQuery.isPending && portfolioDataQuery.data);
  const isLoading = portfolioDataQuery.isLoading || (analysisQuery.isLoading && !hasAnalysisData);
  const isFetching = portfolioDataQuery.isFetching || analysisQuery.isFetching;

  return {
    ...analysisQuery,
    data: analysisQuery.data,
    error,
    isFetching,
    isLoading,
    isPending,
    refetch: portfolioDataQuery.refetch,
  } as unknown as UseQueryResult<PortfolioAnalysis>;
};
