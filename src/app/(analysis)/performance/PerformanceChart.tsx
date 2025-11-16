"use client";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { PortfolioAnalysis } from "@/lib/types";
import { useStore } from "@/lib/store";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { MIN_WINDOW_SIZE, useDateRange } from "@/hooks/useDateRange";

const currency = "$";
const chartKeys = {
  portfolioValue: "Portfolio value",
  profitOrLoss: "Realized profit/loss",
  cash: "Cash",
};

const getChartLineConfig = (selectedBenchmark: BenchmarkIndex) => [
  {
    key: "portfolioValue",
    label: chartKeys.portfolioValue,
    color: "#a5b4fc",
  },
  {
    key: "profitOrLoss",
    label: chartKeys.profitOrLoss,
    color: "#38bdf8",
  },
  {
    key: "cash",
    label: chartKeys.cash,
    color: "#8884d8aa",
  },
  {
    key: "benchmarkStockValue",
    label: BenchmarkIndexToName[selectedBenchmark],
    color: "#34d399",
  },
];

export function PerformanceChart() {
  const { useWithdrawnCash, selectedBenchmark } = useStore();
  const { data } = usePortfolioAnalysis();
  const portfolioAnalysis = data as PortfolioAnalysis;

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;

  const validTimeline = portfolioTimeline
    .map((item) => ({
      ...item,
      date: item.date.slice(0, 10),
      portfolioValue: item.portfolioValue + (useWithdrawnCash ? item.totalCapitalInvested - item.balance : 0),
    }))
    .slice(
      portfolioTimeline.findIndex((record) => Object.entries(record.stocks).length || record.cash),
      -1,
    );

  const [range, handleRangeChange] = useDateRange(validTimeline.length - 1);

  // Track which lines are enabled
  const [enabledLines, setEnabledLines] = useState<Record<string, boolean>>({
    portfolioValue: true,
    profitOrLoss: true,
    cash: true,
    benchmarkStockValue: true,
  });

  const toggleLine = (key: string) => {
    setEnabledLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const windowStart = Math.max(0, Math.min(range[0], validTimeline.length - MIN_WINDOW_SIZE));
  const windowEnd = Math.max(windowStart + MIN_WINDOW_SIZE - 1, Math.min(range[1], validTimeline.length - 1));
  const windowedData = validTimeline.slice(windowStart, windowEnd + 1);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl w-full p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Portfolio value over time ({currency})</h2>
      <div style={{ width: "100%", padding: "0 24px", boxSizing: "border-box", height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/*@ts-ignore*/}
          <LineChart data={windowedData}>
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--foreground)" }} />
            <Tooltip
              formatter={(value: number) => value.toFixed(2)}
              labelFormatter={(label) => `Date: ${label}`}
              itemSorter={({ dataKey }) => {
                return { portfolioValue: -1, profitOrLoss: 1, cash: 2 }[dataKey as string] || 3;
              }}
              contentStyle={{
                background: "var(--tooltip-background)",
                borderRadius: "0.75rem",
                color: "var(--foreground)",
                border: "1px solid #a5b4fc",
              }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            {/* Render only enabled lines */}
            {getChartLineConfig(selectedBenchmark).map(
              (line) =>
                enabledLines[line.key] && (
                  <Line
                    key={line.key}
                    isAnimationActive={false}
                    type="monotone"
                    dataKey={line.key}
                    stroke={line.color}
                    strokeWidth={2}
                    dot={false}
                    name={line.label}
                  />
                ),
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Legend below chart */}
      <div className="flex flex-wrap gap-4 justify-center mt-4">
        {getChartLineConfig(selectedBenchmark).map((line) => (
          <button
            key={line.key}
            onClick={() => toggleLine(line.key)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full font-medium transition cursor-pointer
              ${enabledLines[line.key] ? "bg-white/5 " : "bg-gray-700/40 text-gray-400"}
              border border-white/30 hover:bg-white/30`}
            style={{ borderColor: line.color }}
            type="button"
          >
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 4,
                background: line.color,
                borderRadius: 2,
                opacity: enabledLines[line.key] ? 1 : 0.4,
              }}
            />
            {line.label}
          </button>
        ))}
      </div>
      <div className={"w-full mt-4 flex flex-col gap-8 px-8"}>
        <label className=" font-semibold">
          Date range: {validTimeline[windowStart].date} - {validTimeline[windowEnd].date}
        </label>
        <DualRangeSlider
          min={0}
          max={validTimeline.length - 1}
          value={[windowStart, windowEnd]}
          step={1}
          minStepsBetweenThumbs={MIN_WINDOW_SIZE - 1}
          onValueChange={handleRangeChange}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
