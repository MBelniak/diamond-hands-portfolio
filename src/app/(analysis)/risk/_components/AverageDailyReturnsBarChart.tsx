"use client";

import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { PortfolioAnalysis } from "@/lib/types";
import { getAverageDailyReturnForRange, getAverageBenchmarkDailyReturnForRange, getRangeForPeriod } from "@/lib/utils";
import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { chartTooltipStyle } from "@/lib/chartFormatters";
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
    <Card>
      <CardHeader title="Average daily return" description="Average daily return across the selected period" />
      <CardContent className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={averageReturns}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-strong)" }}
              contentStyle={chartTooltipStyle}
              formatter={(value) => [`${Number(value).toFixed(2)}%`, "Average daily return"]}
            />
            <Bar dataKey="value" fill="#8b5cf6" maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
