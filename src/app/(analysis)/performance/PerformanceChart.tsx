"use client";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { MIN_WINDOW_SIZE, useDateRange } from "@/hooks/useDateRange";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { useStore } from "@/lib/store";
import { PortfolioAnalysis } from "@/lib/types";
import { useState } from "react";
import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CustomTooltip } from "./PerformanceChartTooltip";

const currency = "$";
const chartKeys = {
  portfolioValue: "Portfolio value",
  realizedProfitOrLoss: "Realized profit/loss",
  cash: "Cash",
  profit: "Profit/Loss",
};

const getChartLineConfig = (selectedBenchmark: BenchmarkIndex) => [
  {
    key: "portfolioValue",
    label: chartKeys.portfolioValue,
    color: "#a5b4fc",
  },
  {
    key: "profit",
    label: chartKeys.profit,
    color: "#38bdf8",
  },
  {
    key: "realizedProfitOrLoss",
    label: chartKeys.realizedProfitOrLoss,
    color: "#059669",
  },
  {
    key: "cash",
    label: chartKeys.cash,
    color: "#8884d8aa",
  },
  {
    key: "benchmarkStockValue",
    label: BenchmarkIndexToName[selectedBenchmark],
    color: "#f472b6",
  },
];

export function PerformanceChart() {
  const { useWithdrawnCash, selectedBenchmark } = useStore();
  const { data } = usePortfolioAnalysis();
  const portfolioAnalysis = data as PortfolioAnalysis;

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;

  const validTimeline = portfolioTimeline
    .map((item) => {
      const adjPortfolioValue = item.portfolioValue + (useWithdrawnCash ? item.totalCapitalInvested - item.balance : 0);
      const profit = item.portfolioValue - item.balance;
      return {
        ...item,
        date: item.date.slice(0, 10),
        portfolioValue: adjPortfolioValue,
        realizedProfitOrLoss: item.profitOrLoss,
        profit,
        profitPositive: profit > 0 ? profit : 0,
        profitNegative: profit < 0 ? profit : 0,
      };
    })
    .slice(
      portfolioTimeline.findIndex((record) => Object.entries(record.stocks).length || record.cash),
      -1,
    );

  const [range, handleRangeChange] = useDateRange(validTimeline.length - 1);

  // Track which lines are enabled
  const [enabledLines, setEnabledLines] = useState<Record<string, boolean>>({
    portfolioValue: true,
    profit: true,
    realizedProfitOrLoss: false,
    cash: false,
    benchmarkStockValue: false,
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
          <AreaChart data={windowedData}>
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--foreground)" }} />
            <Tooltip content={<CustomTooltip />} />

            {enabledLines.profit && (
              <>
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="profitPositive"
                  stroke="none"
                  baseValue={0}
                  fill="rgba(34,197,94,0.18)"
                  name="Profit (positive)"
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="profitNegative"
                  stroke="none"
                  baseValue={0}
                  fill="rgba(239,68,68,0.18)"
                  name="Profit (negative)"
                />
              </>
            )}

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
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Legend below chart */}
      <div className="flex flex-wrap gap-4 justify-center mt-4">
        {getChartLineConfig(selectedBenchmark).map((line) => (
          <button
            key={line.key}
            onClick={() => toggleLine(line.key)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full font-medium transition cursor-pointer
              ${enabledLines[line.key] ? "bg-white/5 " : "bg-gray-700/20 text-gray-400"}
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
