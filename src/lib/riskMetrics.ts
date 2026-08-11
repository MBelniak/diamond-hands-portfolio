import { type PortfolioValue, type RiskMetrics } from "@/lib/types";
import { BenchmarkIndex } from "@/lib/benchmarks";
import { addDays, isAfter, parseISO } from "date-fns";

const TRADING_DAYS_PER_YEAR = 252;

function getDailyReturns(timeline: PortfolioValue[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < timeline.length; i++) {
    const previous = timeline[i - 1];
    if (previous.accPortfolioValue === 0) {
      returns.push(0);
    } else {
      const odp = timeline[i].oneDayProfit / previous.accPortfolioValue;
      if (odp > 0.2 || odp < -0.2) {
        console.warn(`Unusually large one-day profit/loss detected on ${timeline[i].date}: ${odp * 100}%`);
        returns.push(0);
      } else {
        returns.push(timeline[i].oneDayProfit / previous.accPortfolioValue);
      }
    }
  }

  return returns;
}

function getBenchmarkDailyReturns(timeline: PortfolioValue[], index: BenchmarkIndex): number[] {
  const returns: number[] = [];
  for (let i = 1; i < timeline.length; i++) {
    const previous = timeline[i - 1];
    if (previous.benchmarkStockValue[index] === 0) {
      returns.push(0);
    } else {
      returns.push(timeline[i].benchmarkOneDayProfit[index] / previous.benchmarkStockValue[index]);
    }
  }

  return returns;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1));
}

function calculateVolatility(dailyReturns: number[]): number {
  return stdDev(dailyReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function calculateMaxDrawdown(timeline: PortfolioValue[]): { value: number; peakDate: string; troughDate: string } {
  if (timeline.length < 2) return { value: 0, peakDate: timeline[0]?.date ?? "", troughDate: timeline[0]?.date ?? "" };
  let peak = timeline[0].accPortfolioValue;
  let peakDate = timeline[0].date;
  let maxDd = 0;
  let maxPeakDate = timeline[0].date;
  let maxTroughDate = timeline[0].date;
  for (const point of timeline) {
    const netValue = point.accPortfolioValue;
    if (netValue > peak) {
      peak = netValue;
      peakDate = point.date;
    }
    const dd = peak > 0 ? (netValue - peak) / peak : 0;
    if (dd < maxDd) {
      maxDd = dd;
      maxPeakDate = peakDate;
      maxTroughDate = point.date;
    }
  }
  return { value: maxDd, peakDate: maxPeakDate, troughDate: maxTroughDate };
}

function calculateSharpeRatio(dailyReturns: number[], annualRiskFreeRate: number): number {
  if (dailyReturns.length < 2) return 0;
  const dailyRfr = annualRiskFreeRate / TRADING_DAYS_PER_YEAR;
  const excess = dailyReturns.map((r) => r - dailyRfr);
  const vol = stdDev(excess);
  if (vol === 0) return 0;
  return (mean(excess) / vol) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function calculateSortinoRatio(dailyReturns: number[], annualRiskFreeRate: number): number {
  if (dailyReturns.length < 2) return 0;
  const dailyRfr = annualRiskFreeRate / TRADING_DAYS_PER_YEAR;
  const excess = dailyReturns.map((r) => r - dailyRfr);
  const downside = excess.filter((r) => r < 0);
  if (!downside.length) return 0;
  const downsideDeviation =
    Math.sqrt(downside.reduce((s, r) => s + r ** 2, 0) / downside.length) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  if (downsideDeviation === 0) return 0;
  return (mean(excess) * TRADING_DAYS_PER_YEAR) / downsideDeviation;
}

function calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return 1;
  const p = portfolioReturns.slice(-n);
  const b = benchmarkReturns.slice(-n);
  const avgP = mean(p);
  const avgB = mean(b);
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    cov += (p[i] - avgP) * (b[i] - avgB);
    varB += (b[i] - avgB) ** 2;
  }
  return varB === 0 ? 1 : cov / varB;
}

function calculateVaR95(dailyReturns: number[]): number {
  if (!dailyReturns.length) return 0;
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.05)] ?? sorted[0] ?? 0;
}

/** Slices the timeline to the last `daysAgo` calendar days. Falls back to full history if the window is too short. */
export function getTimelineWindow(timeline: PortfolioValue[], daysAgo: number): PortfolioValue[] {
  if (daysAgo <= 0) return timeline;
  const cutoff = addDays(new Date(), -daysAgo);
  const filtered = timeline.filter((entry) => isAfter(parseISO(entry.date), cutoff));
  return filtered.length > 1 ? filtered : timeline;
}

export function calculateRiskMetrics(timeline: PortfolioValue[], annualRiskFreeRate = 0.04): RiskMetrics {
  const dailyReturns = getDailyReturns(timeline);
  const benchmarkDailyReturns = Object.values(BenchmarkIndex).reduce(
    (acc, index) => ({
      ...acc,
      [index]: getBenchmarkDailyReturns(timeline, index),
    }),
    {} as Record<BenchmarkIndex, number[]>,
  );
  const beta = Object.values(BenchmarkIndex).reduce(
    (acc, index) => ({
      ...acc,
      [index]: calculateBeta(dailyReturns, benchmarkDailyReturns[index]),
    }),
    {} as Record<BenchmarkIndex, number>,
  );

  const {
    value: maxDrawdown,
    peakDate: maxDrawdownPeakDate,
    troughDate: maxDrawdownTroughDate,
  } = calculateMaxDrawdown(timeline);

  return {
    dailyReturns,
    benchmarkDailyReturns,
    volatility: calculateVolatility(dailyReturns),
    maxDrawdown,
    maxDrawdownPeakDate,
    maxDrawdownTroughDate,
    sharpeRatio: calculateSharpeRatio(dailyReturns, annualRiskFreeRate),
    sortinoRatio: calculateSortinoRatio(dailyReturns, annualRiskFreeRate),
    beta,
    var95: calculateVaR95(dailyReturns),
  };
}
