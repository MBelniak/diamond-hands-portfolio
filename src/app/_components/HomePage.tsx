"use client";
import React, { useEffect } from "react";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { useRouter } from "next/navigation";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { ReportUploadDropzone } from "./ReportUploadDropzone";
import { TryDemoMode } from "@/app/_components/TryDemoMode";
import { useCurrentTheme } from "@/hooks/useCurrentTheme";

export default function HomePage() {
  useCurrentTheme();
  const { data, isPending, error } = usePortfolioAnalysis();
  const router = useRouter();

  useEffect(() => {
    if (data) {
      router.push("/performance");
    }
  }, [data, router]);

  if (isPending || !error) {
    return (
      <>
        <DiamondLoader />
        <p>Loading your data...</p>
      </>
    );
  }

  return (
    <div className={"flex flex-col items-center justify-center gap-6"}>
      <ReportUploadDropzone />
      <TryDemoMode />
    </div>
  );
}
