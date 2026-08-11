"use client";

import { ChartLegend } from "@/app/(analysis)/performance/_components/PerformanceChart/ChartLegend";
import { ChartLine } from "@/app/(analysis)/performance/_components/PerformanceChart/hooks/useChartLines";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { getTimelineWindow } from "@/lib/riskMetrics";
import { PortfolioAnalysis } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Period = "30d" | "90d" | "1y" | "all";
type DailyReturnsLineKey = "portfolio" | BenchmarkIndex;

const benchmarkColors: Record<BenchmarkIndex, string> = {
  [BenchmarkIndex.SP_500]: "#34d399",
  [BenchmarkIndex.NASDAQ]: "#f59e0b",
  [BenchmarkIndex.DOW_JONES]: "#f472b6",
  [BenchmarkIndex.NYSE]: "#a78bfa",
};

const periodDays: Record<Period, number | null> = {
  "30d": 30,
  "90d": 90,
  "1y": 365,
  all: null,
};

function getFilteredTimeline(timeline: PortfolioAnalysis["portfolioTimeline"], period: Period) {
  const days = periodDays[period];
  if (!days) return timeline;
  return getTimelineWindow(timeline, days);
}

function createInitialEnabledLines(selectedBenchmark: BenchmarkIndex): Record<DailyReturnsLineKey, boolean> {
  return {
    portfolio: true,
    [BenchmarkIndex.SP_500]: selectedBenchmark === BenchmarkIndex.SP_500,
    [BenchmarkIndex.NASDAQ]: selectedBenchmark === BenchmarkIndex.NASDAQ,
    [BenchmarkIndex.DOW_JONES]: selectedBenchmark === BenchmarkIndex.DOW_JONES,
    [BenchmarkIndex.NYSE]: selectedBenchmark === BenchmarkIndex.NYSE,
  };
}

export function DailyReturnsComparisonCharts({
  analysis,
  period,
  selectedBenchmark,
}: {
  analysis: PortfolioAnalysis;
  period: Period;
  selectedBenchmark: BenchmarkIndex;
}) {
  const filteredTimeline = useMemo(
    () => getFilteredTimeline(analysis.portfolioTimeline, period),
    [analysis.portfolioTimeline, period],
  );

  const chartLines = useMemo<Array<ChartLine<DailyReturnsLineKey>>>(
    () => [
      {
        key: "portfolio",
        label: "Portfolio",
        color: "#60a5fa",
      },
      ...Object.values(BenchmarkIndex).map((benchmark) => ({
        key: benchmark,
        label: BenchmarkIndexToName[benchmark],
        color: benchmarkColors[benchmark],
      })),
    ],
    [],
  );

  const [enabledLines, setEnabledLines] = useState<Record<DailyReturnsLineKey, boolean>>(() =>
    createInitialEnabledLines(selectedBenchmark),
  );

  useEffect(() => {
    setEnabledLines((previous) => ({
      ...previous,
      [selectedBenchmark]: true,
    }));
  }, [selectedBenchmark]);

  const selectedMetrics = useMemo(() => {
    switch (period) {
      case "30d":
        return analysis.riskMetricsByPeriod.thirtyDays;
      case "90d":
        return analysis.riskMetricsByPeriod.ninetyDays;
      case "1y":
        return analysis.riskMetricsByPeriod.oneYear;
      default:
        return analysis.riskMetrics;
    }
  }, [analysis, period]);

  const lineChartData = useMemo(() => {
    const portfolioReturns = selectedMetrics.dailyReturns;

    return filteredTimeline.slice(1).map((item, index) => {
      const benchmarkReturns = Object.values(BenchmarkIndex).reduce(
        (accumulator, benchmark) => {
          accumulator[benchmark] = selectedMetrics.benchmarkDailyReturns[benchmark][index] * 100;
          return accumulator;
        },
        {} as Record<BenchmarkIndex, number>,
      );

      return {
        date: item.date.slice(0, 10),
        portfolio: portfolioReturns[index] * 100,
        ...benchmarkReturns,
      };
    });
  }, [filteredTimeline, selectedMetrics]);

  const averageReturns = useMemo(() => {
    const portfolioAverage =
      selectedMetrics.dailyReturns.length > 0
        ? selectedMetrics.dailyReturns.reduce((sum, value) => sum + value, 0) / selectedMetrics.dailyReturns.length
        : 0;

    const benchmarkAverages = Object.values(BenchmarkIndex).map((benchmark) => ({
      name: BenchmarkIndexToName[benchmark],
      value:
        selectedMetrics.benchmarkDailyReturns[benchmark].length > 0
          ? selectedMetrics.benchmarkDailyReturns[benchmark].reduce((sum, value) => sum + value, 0) /
            selectedMetrics.benchmarkDailyReturns[benchmark].length
          : 0,
    }));

    return [
      { name: "Portfolio", value: portfolioAverage * 100 },
      ...benchmarkAverages.map((item) => ({ ...item, value: item.value * 100 })),
    ];
  }, [selectedMetrics]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <div className="flex flex-col gap-4 rounded-sm border border-white/10 bg-white/5 p-5 backdrop-blur-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Daily return comparison</h2>
            <p className="text-sm opacity-70">Portfolio performance versus all tracked benchmarks</p>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--foreground)" }} minTickGap={24} />
              <YAxis tick={{ fontSize: 12, fill: "var(--foreground)" }} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, ""]} />
              {chartLines.map(
                (line) =>
                  enabledLines[line.key] && (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.key}
                      name={line.label}
                      stroke={line.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  ),
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend chartLines={chartLines} enabledLines={enabledLines} handleLinesChange={setEnabledLines} />
      </div>

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
    </div>
  );
}
