import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn, formatPercent, getProfitLossClass } from "@/lib/utils";
import { TimePeriod, timePeriodEnumToLabel } from "@/app/(analysis)/performance/_types/TimePeriod";
import { ReturnMetricsOnBenchmark } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";
import { InfoTooltip } from "./KeyFigure";

type Outcome = "better" | "worse" | "even";

// Differences smaller than this (in percentage points) are treated as a tie
const TIE_THRESHOLD_PP = 0.005;

const outcomeOf = (diff: number): Outcome =>
  Math.abs(diff) < TIE_THRESHOLD_PP ? "even" : diff > 0 ? "better" : "worse";

const outcomeSegmentClass: Record<Outcome, string> = {
  better: "bg-green-600 dark:bg-green-500",
  worse: "bg-red-600 dark:bg-red-500",
  even: "bg-muted-foreground/40",
};

const outcomeChipClass: Record<Outcome, string> = {
  better: "border-green-600/60 text-green-700 dark:border-green-400/50 dark:text-green-400",
  worse: "border-red-600/60 text-red-700 dark:border-red-400/50 dark:text-red-400",
  even: "border-border text-muted-foreground",
};

const OutcomeIcon: Record<Outcome, React.FC<{ className?: string }>> = {
  better: ArrowUpRight,
  worse: ArrowDownRight,
  even: Minus,
};

/**
 * Period-by-period comparison of the portfolio against a benchmark.
 * Delta = portfolio return − benchmark return (percentage points): green means the portfolio did better.
 */
export function BenchmarkComparison({
  benchmarkName,
  periods,
  benchmarkReturns,
  portfolioReturns,
}: {
  benchmarkName: string;
  periods: TimePeriod[];
  benchmarkReturns: Partial<ReturnMetricsOnBenchmark>;
  portfolioReturns: Partial<ReturnMetricsOnBenchmark>;
}) {
  const rows = periods
    .filter((period) => benchmarkReturns[period] && portfolioReturns[period])
    .map((period) => {
      const benchmark = benchmarkReturns[period]!.return;
      const portfolio = portfolioReturns[period]!.return;
      const diff = portfolio - benchmark;
      return { period, benchmark, portfolio, diff, outcome: outcomeOf(diff) };
    });

  const wins = rows.filter((row) => row.outcome === "better").length;

  return (
    <div className="flex flex-col gap-4">
      {/* At-a-glance summary: one segment per period, green where the portfolio wins */}
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Portfolio beats {benchmarkName} in{" "}
          <span className="font-medium tabular-nums">
            {wins} of {rows.length}
          </span>{" "}
          periods
        </p>
        <div className="flex gap-1" aria-hidden>
          {rows.map((row) => (
            <div key={row.period} className="flex flex-1 flex-col gap-1">
              <span className={cn("h-1.5 w-full", outcomeSegmentClass[row.outcome])} />
              <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {timePeriodEnumToLabel[row.period]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-muted-foreground border-b text-xs tracking-wide uppercase">
            <th className="py-1.5 text-left font-medium">Period</th>
            <th className="max-w-24 truncate py-1.5 text-right font-medium" title={benchmarkName}>
              {benchmarkName}
            </th>
            <th className="py-1.5 text-right font-medium">Portfolio</th>
            <th className="py-1.5 text-right font-medium">
              <span className="inline-flex items-center gap-1">
                Delta
                <InfoTooltip>
                  Portfolio return minus {benchmarkName} return, in percentage points. Green means your portfolio did
                  better.
                </InfoTooltip>
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-border/60 divide-y">
          {rows.map(({ period, benchmark, portfolio, diff, outcome }) => {
            const Icon = OutcomeIcon[outcome];
            return (
              <tr key={period}>
                <td className="text-muted-foreground py-1.5">{timePeriodEnumToLabel[period]}</td>
                <td className={cn("py-1.5 text-right", getProfitLossClass(benchmark))}>
                  {formatPercent(benchmark, { signed: true })}
                </td>
                <td className={cn("py-1.5 text-right", getProfitLossClass(portfolio))}>
                  {formatPercent(portfolio, { signed: true })}
                </td>
                <td className="py-1.5 pl-2 text-right">
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 border px-1.5 py-px text-xs font-medium",
                      outcomeChipClass[outcome],
                    )}
                  >
                    <Icon className="size-3" />
                    {Math.abs(diff).toFixed(2)} pp
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
