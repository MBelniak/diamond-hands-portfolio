"use client";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { PerformanceKeyFigures } from "@/app/(analysis)/performance/PerformanceKeyFigures";
import { PerformanceChart } from "./PerformanceChart";
import { useRouter } from "next/navigation";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useEffect } from "react";

export default function PerformancePage() {
  const { error, isFetching, data } = usePortfolioAnalysis();
  const router = useRouter();

  useEffect(() => {
    if (error || (!isFetching && !data)) {
      router.push("/");
    }
  }, [data, error, isFetching, router]);

  if (isFetching || error || (!isFetching && !data)) {
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
