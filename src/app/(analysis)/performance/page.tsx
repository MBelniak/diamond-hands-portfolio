"use client";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { PerformanceKeyFigures } from "@/app/(analysis)/performance/_components/PerformanceKeyFigures/PerformanceKeyFigures";
import { PerformanceChart } from "./_components/PerformanceChart/PerformanceChart";
import { Benchmarks } from "./_components/Benchmarks/Benchmarks";
import { useRouter } from "next/navigation";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export default function PerformancePage() {
  const { error, isFetching, data } = usePortfolioAnalysis();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (error || (!isFetching && !data)) {
      router.push("/");
    }
  }, [data, error, isFetching, router]);

  const willRenderContent = !isFetching && !error && data;

  useLayoutEffect(() => {
    if (willRenderContent && containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.from(containerRef.current, {
          opacity: 0,
          y: 100,
          duration: 0.8,
          ease: "power1.out",
        });
      });

      return () => ctx.revert();
    }
  }, [willRenderContent]);

  if (!willRenderContent) {
    return (
      <>
        <DiamondLoader />
        <p>Loading your data...</p>
      </>
    );
  }

  return (
    <div className={"flex flex-col gap-8 w-full"} ref={containerRef}>
      <PerformanceKeyFigures />
      <PerformanceChart />
      <Benchmarks />
    </div>
  );
}
