"use client";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { PortfolioAnalysis } from "@/lib/types";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePageEntrance } from "@/client/hooks/usePageEntrance";
import { cn } from "@/lib/utils";
import {
  RiskMetricCard,
  sharpeRating,
  volatilityRating,
  drawdownRating,
  var95Rating,
} from "./_components/RiskMetricCard";
import { RiskBetaBreakdown } from "./_components/RiskBetaBreakdown";
import { DailyReturnsComparisonCharts } from "./_components/DailyReturnsComparisonCharts";
import { useStore } from "@/lib/store";

type Period = "30d" | "90d" | "1y" | "all";

const periods: { label: string; value: Period }[] = [
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1Y", value: "1y" },
  { label: "All", value: "all" },
];

export default function RiskPage() {
  const { error, isFetching, data } = usePortfolioAnalysis();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("1y");
  const { selectedBenchmark } = useStore();

  useEffect(() => {
    if (error) router.push("/");
  }, [error, router]);

  const willRenderContent = !isFetching && !error && data;
  const containerRef = usePageEntrance(!!willRenderContent);

  if (!willRenderContent) {
    return (
      <>
        <DiamondLoader />
        <p>Loading your data...</p>
      </>
    );
  }

  const analysis = data as PortfolioAnalysis;
  const metrics =
    period === "30d"
      ? analysis.riskMetricsByPeriod.thirtyDays
      : period === "90d"
        ? analysis.riskMetricsByPeriod.ninetyDays
        : period === "1y"
          ? analysis.riskMetricsByPeriod.oneYear
          : analysis.riskMetrics;

  return (
    <div className="flex flex-col gap-6 w-full" ref={containerRef}>
      {/* Header + period selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Risk Analysis</h1>
        <div className="flex gap-1 bg-white/5 backdrop-blur-lg rounded-sm p-1">
          {periods.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={cn(
                "cursor-pointer px-4 py-1.5 text-sm rounded-sm transition-colors",
                period === value ? "bg-white/20 font-semibold" : "opacity-60 hover:opacity-90",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Core metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskMetricCard
          title="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          rating={sharpeRating(metrics.sharpeRatio)}
          tooltip="Annualized risk-adjusted return relative to a 4% risk-free rate. Higher is better. >1 is good, >2 is excellent."
        />
        <RiskMetricCard
          title="Sortino Ratio"
          value={metrics.sortinoRatio.toFixed(2)}
          rating={sharpeRating(metrics.sortinoRatio)}
          tooltip="Like the Sharpe Ratio, but only penalises downside volatility. Higher is better; typically runs above the Sharpe Ratio."
        />
        <RiskMetricCard
          title="Annualized Volatility"
          value={`${(metrics.volatility * 100).toFixed(1)}%`}
          rating={volatilityRating(metrics.volatility)}
          tooltip="Annualized standard deviation of daily returns. Lower means smoother returns. Below 15% is low; above 30% is high."
        />
        <RiskMetricCard
          title="Max Drawdown"
          value={`${(metrics.maxDrawdown * 100).toFixed(1)}%`}
          rating={drawdownRating(metrics.maxDrawdown)}
          tooltip="Largest peak-to-trough decline in portfolio value over the selected period. The closer to 0%, the better."
          subtitle={`Peak ${new Date(metrics.maxDrawdownPeakDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })} → Low ${new Date(metrics.maxDrawdownTroughDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
        />
        <RiskMetricCard
          title="VaR (95%)"
          value={`${(metrics.var95 * 100).toFixed(2)}%`}
          rating={var95Rating(metrics.var95)}
          tooltip="Historical Value at Risk at 95% confidence. On your worst 5% of days, this is the minimum daily loss you'd expect."
          subtitle="Daily loss threshold"
        />
      </div>

      <DailyReturnsComparisonCharts analysis={analysis} period={period} selectedBenchmark={selectedBenchmark} />

      {/* Beta breakdown */}
      <RiskBetaBreakdown metrics={metrics} />
    </div>
  );
}
