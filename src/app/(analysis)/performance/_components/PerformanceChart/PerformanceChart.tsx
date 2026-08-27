"use client";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { MIN_WINDOW_SIZE, useDateRange } from "@/client/hooks/useDateRange";
import { useStore } from "@/lib/store";
import { PortfolioAnalysis, PortfolioCurrencyToSymbol } from "@/lib/types";
import { useEffect, useState } from "react";
import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CustomTooltip } from "./PerformanceChartTooltip";
import { TimePeriodZoom } from "@/app/(analysis)/performance/_components/PerformanceChart/TimePeriodZoom";
import { useTimePeriodChange } from "@/app/(analysis)/performance/_components/PerformanceChart/hooks/useTimePeriodChange";
import { ChartLegend } from "@/app/(analysis)/performance/_components/PerformanceChart/ChartLegend";
import {
  ChartLineKey,
  useChartLines,
} from "@/app/(analysis)/performance/_components/PerformanceChart/hooks/useChartLines";

export function PerformanceChart() {
  const { useWithdrawnCash, selectedBenchmark, selectedPortfolio } = useStore();
  const { data } = usePortfolioAnalysis();
  const portfolioAnalysis = data as PortfolioAnalysis;

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;

  const chartLines = useChartLines(selectedBenchmark, useWithdrawnCash);

  const [range, handleRangeChange] = useDateRange(portfolioTimeline.length - 1);

  // Track which lines are enabled
  const [enabledLines, setEnabledLines] = useState<Record<ChartLineKey, boolean>>({
    portfolioValue: true,
    accPortfolioValue: false,
    profitOrLoss: true,
    realizedProfitOrLoss: false,
    cash: false,
    benchmarkData: false,
  });

  useEffect(() => {
    if (useWithdrawnCash) {
      setEnabledLines((prev) => ({
        ...prev,
        portfolioValue: false,
        accPortfolioValue: true,
      }));
    } else {
      setEnabledLines((prev) => ({
        ...prev,
        portfolioValue: true,
        accPortfolioValue: false,
      }));
    }
  }, [useWithdrawnCash]);

  useEffect(() => {
    // Reset range if range[0] or range[1] is out of bounds after portfolioTimeline changes
    if (range[0] >= portfolioTimeline.length || range[1] >= portfolioTimeline.length) {
      handleRangeChange([0, portfolioTimeline.length - 1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPortfolio, portfolioTimeline.length]);

  const [period, handlePeriodChange] = useTimePeriodChange(portfolioTimeline, handleRangeChange);

  const windowedData = portfolioTimeline.slice(range[0], range[1] + 1);

  return (
    <div className="flex flex-col bg-white/5 backdrop-blur-lg rounded-sm shadow-xl w-full p-6 gap-4 relative">
      <h2 className="text-2xl font-bold mb-2 text-center">
        Portfolio value over time ({PortfolioCurrencyToSymbol[selectedPortfolio]})
      </h2>
      <div className={"ml-8"}>
        <TimePeriodZoom selectedPeriod={period} handlePeriodChange={handlePeriodChange} />
      </div>
      <div className={"w-full pr-4 h-[350px]"}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={windowedData}>
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--foreground)" }} />
            <Tooltip content={<CustomTooltip />} />

            {enabledLines.profitOrLoss && (
              <>
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="profit"
                  stroke="none"
                  baseValue={0}
                  fill="rgba(34,197,94,0.18)"
                  name="Profit"
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="loss"
                  stroke="none"
                  baseValue={0}
                  fill="rgba(239,68,68,0.18)"
                  name="Loss"
                />
              </>
            )}

            {/* Render only enabled lines */}
            {chartLines.map(
              (line) =>
                enabledLines[line.key] && (
                  <Line
                    key={line.key}
                    isAnimationActive={false}
                    type="monotone"
                    dataKey={line.key === "benchmarkData" ? `benchmarkData.${selectedBenchmark}.stockValue` : line.key}
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
      <ChartLegend chartLines={chartLines} enabledLines={enabledLines} handleLinesChange={setEnabledLines} />
      <div className={"w-full mt-4 flex flex-col gap-8 px-8"}>
        {windowedData.length > 0 && (
          <label className=" font-semibold">
            Date range: {windowedData[0].date.slice(0, 10)} - {windowedData[windowedData.length - 1].date.slice(0, 10)}
          </label>
        )}
        <DualRangeSlider
          min={0}
          max={portfolioTimeline.length - 1}
          value={range}
          step={1}
          minStepsBetweenThumbs={MIN_WINDOW_SIZE - 1}
          onValueChange={handleRangeChange}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
