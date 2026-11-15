"use client";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { MIN_WINDOW_SIZE, useDateRange } from "@/client/hooks/useDateRange";
import { useStore } from "@/lib/store";
import { PortfolioAnalysis, PortfolioCurrencyToSymbol } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CustomTooltip } from "./PerformanceChartTooltip";
import { TimePeriodZoom } from "@/app/(analysis)/performance/_components/PerformanceChart/TimePeriodZoom";
import { useTimePeriodChange } from "@/app/(analysis)/performance/_components/PerformanceChart/hooks/useTimePeriodChange";
import { ChartLegend } from "@/app/(analysis)/performance/_components/PerformanceChart/ChartLegend";
import {
  ChartLineKey,
  useChartLines,
} from "@/app/(analysis)/performance/_components/PerformanceChart/hooks/useChartLines";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DATE_AXIS_MIN_TICK_GAP, formatCompactNumber, getDateTickFormatter } from "@/lib/chartFormatters";

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" };

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
  const firstDate = windowedData[0]?.date;
  const lastDate = windowedData.at(-1)?.date;
  const dateTickFormatter = useMemo(() => getDateTickFormatter(firstDate, lastDate), [firstDate, lastDate]);

  return (
    <Card>
      <CardHeader
        title={`Portfolio value over time (${PortfolioCurrencyToSymbol[selectedPortfolio]})`}
        actions={<TimePeriodZoom selectedPeriod={period} handlePeriodChange={handlePeriodChange} />}
      />
      <CardContent className="flex flex-col gap-6">
        <div className={"h-[350px] w-full"}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={windowedData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="date"
                tick={axisTick}
                tickFormatter={dateTickFormatter}
                minTickGap={DATE_AXIS_MIN_TICK_GAP}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tickMargin={10}
              />
              <YAxis tick={axisTick} tickFormatter={formatCompactNumber} tickLine={false} axisLine={false} width={48} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              />

              {enabledLines.profitOrLoss && (
                <>
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="profit"
                    stroke="none"
                    baseValue={0}
                    fill="rgba(34,197,94,0.14)"
                    name="Profit"
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="loss"
                    stroke="none"
                    baseValue={0}
                    fill="rgba(239,68,68,0.14)"
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
                      dataKey={
                        line.key === "benchmarkData" ? `benchmarkData.${selectedBenchmark}.stockValue` : line.key
                      }
                      stroke={line.color}
                      strokeWidth={1.75}
                      dot={false}
                      name={line.label}
                    />
                  ),
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend chartLines={chartLines} enabledLines={enabledLines} handleLinesChange={setEnabledLines} />
        <div className={"flex w-full flex-col gap-4 border-t pt-6"}>
          {windowedData.length > 0 && (
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Date range</span>
              <span className="tabular-nums">
                {windowedData[0].date.slice(0, 10)} – {windowedData[windowedData.length - 1].date.slice(0, 10)}
              </span>
            </div>
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
      </CardContent>
    </Card>
  );
}
