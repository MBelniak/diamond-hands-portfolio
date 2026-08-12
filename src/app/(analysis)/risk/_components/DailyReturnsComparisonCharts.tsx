"use client";

import { PortfolioAnalysis } from "@/lib/types";
import { AverageDailyReturnsBarChart } from "./AverageDailyReturnsBarChart";
import { DailyReturnsLineChart } from "./DailyReturnsLineChart";

type Period = "30d" | "90d" | "1y" | "all";

export function DailyReturnsComparisonCharts({ analysis, period }: { analysis: PortfolioAnalysis; period: Period }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <DailyReturnsLineChart analysis={analysis} period={period} />
      <AverageDailyReturnsBarChart analysis={analysis} period={period} />
    </div>
  );
}
