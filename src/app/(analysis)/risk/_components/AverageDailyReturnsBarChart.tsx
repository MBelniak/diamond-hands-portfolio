"use client";

import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { PortfolioAnalysis } from "@/lib/types";
import { getAverageDailyReturnForRange, getAverageBenchmarkDailyReturnForRange, getRangeForPeriod } from "@/lib/utils";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AverageDailyReturnsBarChart({
  analysis,
  period,
}: {
  analysis: PortfolioAnalysis;
  period: "30d" | "90d" | "1y" | "all";
}) {
  const periodRange = useMemo<[number, number]>(() => {
    const timelineLength = analysis.portfolioTimeline.length;
    const range = getRangeForPeriod(timelineLength, period);

    if (range) {
      return range;
    }

    return [0, Math.max(0, timelineLength - 1)];
  }, [analysis.portfolioTimeline.length, period]);

  const averageReturns = useMemo(() => {
    const portfolioAverage = getAverageDailyReturnForRange(analysis.portfolioTimeline, periodRange) * 100;

    const benchmarkAverages = Object.values(BenchmarkIndex).map((benchmark) => ({
      name: BenchmarkIndexToName[benchmark],
      value: getAverageBenchmarkDailyReturnForRange(analysis.portfolioTimeline, periodRange, benchmark) * 100,
    }));

    return [{ name: "Portfolio", value: portfolioAverage }, ...benchmarkAverages];
  }, [analysis.portfolioTimeline, periodRange]);

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-white/10 bg-white/5 p-5 backdrop-blur-lg">
      <div>
        <h2 className="text-lg font-semibold">Average daily return</h2>
        <p className="text-sm opacity-70">Average daily return across the selected period</p>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={averageReturns}>
            <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--foreground)" }} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "Average daily return"]} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
