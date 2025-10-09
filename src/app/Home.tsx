"use client";
import React, { useEffect } from "react";
import { useStore } from "../lib/store";
import { redirect } from "next/navigation";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { portfolioAnalysisDB } from "../lib/utils";
import { usePortfolioAnalysisQuery } from "../hooks/usePortfolioAnalysisQuery";
import { LandingPage } from "@/app/LandingPage";

export default function Home() {
  const { portfolioAnalysis, setPortfolioAnalysis } = useStore();

  const { isFetching, data, error } = usePortfolioAnalysisQuery();

  useEffect(() => {
    if (data) {
      setPortfolioAnalysis(data);
    } else if (error) {
      portfolioAnalysisDB.removePortfolioAnalysis().then();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, error]);

  if (portfolioAnalysis != null) {
    redirect("/performance");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      {isFetching && (
        <>
          <DiamondLoader />
          <p className="mt-4 text-center text-sm text-blue-500">Loading portfolio analysis...</p>
        </>
      )}
      {!isFetching && <LandingPage />}
    </div>
  );
}
