"use client";

import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { PerformanceKeyFigures } from "@/app/(analysis)/performance/PerformanceKeyFigures";
import { PerformanceChart } from "./PerformanceChart";
import { redirect } from "next/navigation";
import { DiamondLoader } from "@/components/ui/DiamondLoader";

export default function PerformancePage() {
  const { error, isLoading, data } = usePortfolioAnalysis();

  if (error || (!isLoading && !data)) {
    redirect("/");
  }

  if (isLoading) {
    return (
      <>
        <DiamondLoader />
        <p>Loading your data...</p>
      </>
    );
  }

  return (
    <>
      <PerformanceKeyFigures />
      <PerformanceChart />
    </>
  );
}
