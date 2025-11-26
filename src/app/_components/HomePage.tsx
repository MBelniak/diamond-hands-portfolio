"use client";
import React, { useEffect } from "react";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { useRouter } from "next/navigation";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useCurrentTheme } from "@/hooks/useCurrentTheme";
import { ReportUploadDropzone } from "./ReportUploadDropzone";

export default function HomePage() {
  useCurrentTheme();
  const { data, isFetching } = usePortfolioAnalysis();
  const router = useRouter();

  useEffect(() => {
    if (data) {
      router.push("/performance");
    }
  }, [data, router]);

  if (isFetching || data) {
    return (
      <>
        <DiamondLoader />
        <p>Loading your data...</p>
      </>
    );
  }

  return <ReportUploadDropzone />;
}
