"use client";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { MIN_WINDOW_SIZE, useDateRange } from "@/hooks/useDateRange";
import { useStore } from "@/lib/store";
import { PortfolioAnalysis, PortfolioCurrencyToSymbol } from "@/lib/types";
import { useMemo, useState } from "react";
import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CustomTooltip } from "./PerformanceChartTooltip";
import { TimePeriodZoom } from "@/app/(analysis)/performance/_components/PerformanceChart/TimePeriodZoom";
import { useTimePeriodChange } from "@/app/(analysis)/performance/_components/PerformanceChart/hooks/useTimePeriodChange";
import { ChartLegend } from "@/app/(analysis)/performance/_components/PerformanceChart/ChartLegend";
import {
  ChartLineKey,
  useChartLines,
} from "@/app/(analysis)/performance/_components/PerformanceChart/hooks/useChartLines";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";

export function PerformanceChart() {
  const { useWithdrawnCash, selectedBenchmark, selectedPortfolio } = useStore();
  const { data, isDataStale } = usePortfolioAnalysis();
  const portfolioAnalysis = data as PortfolioAnalysis;

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;

  const chartLines = useChartLines(selectedBenchmark);

  const validTimeline = useMemo(
    () =>
      portfolioTimeline
        .map((item) => {
          const adjPortfolioValue =
            item.portfolioValue + (useWithdrawnCash ? item.totalCapitalInvested - item.balance : 0);
          const profit = item.portfolioValue - item.balance;
          return {
            ...item,
            benchmarkStockValue: item.benchmarkStockValue[selectedBenchmark],
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
        ),
    [portfolioTimeline, selectedBenchmark, useWithdrawnCash],
  );

  const [range, handleRangeChange] = useDateRange(validTimeline.length - 1);

  // Track which lines are enabled
  const [enabledLines, setEnabledLines] = useState<Record<ChartLineKey, boolean>>({
    portfolioValue: true,
    profit: true,
    realizedProfitOrLoss: false,
    cash: false,
    benchmarkStockValue: false,
  });

  const [period, handlePeriodChange] = useTimePeriodChange(validTimeline, handleRangeChange);

  const windowStart = Math.max(0, Math.min(range[0], validTimeline.length - MIN_WINDOW_SIZE));
  const windowEnd = Math.max(windowStart + MIN_WINDOW_SIZE - 1, Math.min(range[1], validTimeline.length - 1));
  const windowedData = validTimeline.slice(windowStart, windowEnd + 1);

  return (
    <div className="flex flex-col bg-white/10 backdrop-blur-lg rounded-sm shadow-xl w-full p-6 gap-4 relative">
      {isDataStale && <LoaderOverlay />}
      <h2 className="text-2xl font-bold mb-2 text-center">
        Portfolio value over time ({PortfolioCurrencyToSymbol[selectedPortfolio]})
      </h2>
      <div className={"ml-8"}>
        <TimePeriodZoom selectedPeriod={period} handlePeriodChange={handlePeriodChange} />
      </div>
      <div className={"w-full pr-4 h-[350px]"}>
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
            {chartLines.map(
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
      <ChartLegend chartLines={chartLines} enabledLines={enabledLines} handleLinesChange={setEnabledLines} />
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
