"use client";

import { ChartLegend } from "@/app/(analysis)/performance/_components/PerformanceChart/ChartLegend";
import { ChartLine } from "@/app/(analysis)/performance/_components/PerformanceChart/hooks/useChartLines";
import { MIN_WINDOW_SIZE, useDateRange } from "@/client/hooks/useDateRange";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { PortfolioAnalysis } from "@/lib/types";
import { getBenchmarkDailyReturnsForRange, getFilteredTimeline, getRangeForPeriod } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { chartTooltipStyle, DATE_AXIS_MIN_TICK_GAP, getDateTickFormatter } from "@/lib/chartFormatters";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DailyReturnsLineKey = "portfolio" | BenchmarkIndex;

const benchmarkColors: Record<BenchmarkIndex, string> = {
  [BenchmarkIndex.SP_500]: "#34d399",
  [BenchmarkIndex.NASDAQ]: "#f59e0b",
  [BenchmarkIndex.DOW_JONES]: "#f472b6",
  [BenchmarkIndex.NYSE]: "#a78bfa",
};

function createInitialEnabledLines(): Record<DailyReturnsLineKey, boolean> {
  return {
    portfolio: true,
    ...(Object.values(BenchmarkIndex) as BenchmarkIndex[]).reduce(
      (acc, benchmark) => {
        acc[benchmark] = false;
        return acc;
      },
      {} as Record<BenchmarkIndex, boolean>,
    ),
  };
}

const chartLines = [
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
] as ChartLine<DailyReturnsLineKey>[];

export function DailyReturnsLineChart({
  analysis,
  period,
}: {
  analysis: PortfolioAnalysis;
  period: "30d" | "90d" | "1y" | "all";
}) {
  const timelineLength = analysis.portfolioTimeline.length;
  const [range, handleRangeChange] = useDateRange(Math.max(0, timelineLength - 1));
  const [enabledLines, setEnabledLines] = useState<Record<DailyReturnsLineKey, boolean>>(createInitialEnabledLines);

  useEffect(() => {
    if (timelineLength === 0) {
      return;
    }

    const nextRange = getRangeForPeriod(timelineLength, period);
    if (!nextRange) {
      return;
    }

    handleRangeChange(nextRange);
  }, [handleRangeChange, period, timelineLength]);

  const filteredTimeline = useMemo(
    () => getFilteredTimeline(analysis.portfolioTimeline, range),
    [analysis.portfolioTimeline, range],
  );

  const lineChartData = useMemo(() => {
    const benchmarkReturns = Object.values(BenchmarkIndex).reduce(
      (all, benchmark) => {
        all[benchmark] = getBenchmarkDailyReturnsForRange(analysis.portfolioTimeline, range, benchmark);
        return all;
      },
      {} as Record<BenchmarkIndex, number[]>,
    );

    return filteredTimeline.map((item, index) => {
      const originalIndex = range[0] + index;

      return {
        date: item.date.slice(0, 10),
        portfolio: item.dailyReturn * 100,
        ...Object.values(BenchmarkIndex).reduce(
          (accumulator, benchmark) => {
            accumulator[benchmark] = (benchmarkReturns[benchmark][index] ?? 0) * 100;
            return accumulator;
          },
          {} as Record<BenchmarkIndex, number>,
        ),
        originalIndex,
      };
    });
  }, [analysis.portfolioTimeline, filteredTimeline, range]);

  const firstDate = lineChartData[0]?.date;
  const lastDate = lineChartData.at(-1)?.date;
  const dateTickFormatter = useMemo(() => getDateTickFormatter(firstDate, lastDate), [firstDate, lastDate]);

  return (
    <Card>
      <CardHeader title="Daily return comparison" description="Portfolio performance versus all tracked benchmarks" />
      <CardContent className="flex flex-col gap-6">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickFormatter={dateTickFormatter}
                minTickGap={DATE_AXIS_MIN_TICK_GAP}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tickMargin={10}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                separator=""
                formatter={(value) => [`${Number(value).toFixed(2)}%`, ""]}
              />
              {chartLines.map(
                (line) =>
                  enabledLines[line.key] && (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.key}
                      name={line.label}
                      stroke={line.color}
                      strokeWidth={1.75}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ),
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <ChartLegend chartLines={chartLines} enabledLines={enabledLines} handleLinesChange={setEnabledLines} />
        <div className="border-t pt-6">
          <DualRangeSlider
            min={0}
            max={Math.max(0, timelineLength - 1)}
            value={[range[0], range[1]]}
            step={1}
            minStepsBetweenThumbs={MIN_WINDOW_SIZE - 1}
            onValueChange={handleRangeChange}
            style={{ width: "100%" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
