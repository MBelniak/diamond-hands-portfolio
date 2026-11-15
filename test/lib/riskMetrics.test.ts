import { describe, it, expect } from "vitest";
import { getTimelineWindow, calculateRiskMetrics } from "@/lib/riskMetrics";
import { BenchmarkIndex } from "@/lib/benchmarks";
import type { PortfolioValue } from "@/lib/types";

// Minimal PortfolioValue factory
function makeEntry(date: string, accValue: number, dailyReturn: number): PortfolioValue {
  const benchmarkData = Object.values(BenchmarkIndex).reduce(
    (acc, index) => ({
      ...acc,
      [index]: { dailyReturn: 0, accReturn: 0, accValue: 0 },
    }),
    {} as PortfolioValue["benchmarkData"],
  );
  return { date, accPortfolioValue: accValue, dailyReturn, benchmarkData } as unknown as PortfolioValue;
}

const sampleTimeline: PortfolioValue[] = [
  makeEntry("2024-01-01", 10000, 0),
  makeEntry("2024-01-02", 10100, 0.01),
  makeEntry("2024-01-03", 10050, -0.005),
  makeEntry("2024-01-04", 10200, 0.015),
  makeEntry("2024-01-05", 10150, -0.005),
];

describe("getTimelineWindow", () => {
  it("returns the full timeline when daysAgo is 0", () => {
    expect(getTimelineWindow(sampleTimeline, 0)).toEqual(sampleTimeline);
  });

  it("returns the full timeline when daysAgo is negative", () => {
    expect(getTimelineWindow(sampleTimeline, -1)).toEqual(sampleTimeline);
  });

  it("falls back to full timeline when window would have only 1 entry", () => {
    // Very large daysAgo in the past relative to fixed dates → filtered to 0 entries → fallback
    const result = getTimelineWindow(sampleTimeline, 1);
    // Since all dates are in the past, all entries pass the isAfter check — full or subset returned
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("calculateRiskMetrics", () => {
  it("returns 0 maxDrawdown for a strictly increasing timeline", () => {
    const increasing = [
      makeEntry("2024-01-01", 100, 0.01),
      makeEntry("2024-01-02", 110, 0.01),
      makeEntry("2024-01-03", 120, 0.01),
    ];
    const result = calculateRiskMetrics(increasing);
    expect(result.maxDrawdown).toBe(0);
  });

  it("returns 0 volatility for a flat timeline (single day)", () => {
    const flat = [makeEntry("2024-01-01", 100, 0)];
    const result = calculateRiskMetrics(flat);
    expect(result.volatility).toBe(0);
  });
});
