"use client";
import React, { useEffect } from "react";
import { LandingPage } from "@/app/_components/LandingPage";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { redirect } from "next/navigation";
import { DiamondLoader } from "@/components/ui/DiamondLoader";

export default function HomePage() {
  const { data, isLoading } = usePortfolioAnalysis();

  useEffect(() => {
    if (data) {
      redirect("/performance");
    }
  }, [data]);

  if (isLoading) {
    return (
      <>
        <DiamondLoader />
        <p>Loading your data...</p>
      </>
    );
  }

  return <LandingPage />;
}
