import { BenchmarkData, CashFlow, TWRValueTimeline, ValueTimeline } from "@/lib/types";
import { BenchmarkIndex } from "@/lib/benchmarks";
import { formatDate } from "@/lib/utils";
import { xirr } from "node-irr";
import { addDays, isAfter, isBefore, isSameDay, startOfDay } from "date-fns";

export enum ReturnMetric {
  SIMPLE_RETURN = "SR",
  MONEY_WEIGHTED_RETURN = "MWR",
  TIME_WEIGHTED_RETURN = "TWR",
}

/** Cash flows within the window, signed for IRR: start value as an outflow, deposits negated, end value as an inflow. */
const getCashFlowForPeriod = (
  cashFlow: CashFlow,
  portfolioTimeline: ValueTimeline,
  windowStartDate: Date,
  windowEndDate: Date,
): CashFlow => {
  const valueOn = (day: Date) => portfolioTimeline.find((el) => isSameDay(el.date, day))?.value ?? 0;
  return [
    { date: formatDate(windowStartDate), amount: -valueOn(windowStartDate) },
    ...cashFlow
      .filter(({ date }) => {
        const eventDate = startOfDay(new Date(date));
        return !isBefore(eventDate, startOfDay(windowStartDate)) && !isAfter(eventDate, startOfDay(windowEndDate));
      })
      .map((operation) => ({ ...operation, amount: -operation.amount })),
    { date: formatDate(windowEndDate), amount: valueOn(windowEndDate) },
  ];
};

export const getCashFlowForBenchmarkComparison = (cashFlow: CashFlow) => {
  return cashFlow.filter((entry) => entry.amount >= 0);
};

/**
 * Benchmark value timeline with its matching cash flow. With withdrawn cash included the benchmark keeps every
 * deposit invested; otherwise withdrawals are taken out of it too, like from the portfolio.
 */
export const getBenchmarkTimeline = <T extends { benchmarkData: Record<BenchmarkIndex, BenchmarkData> }>(
  timeline: T[],
  cashFlow: CashFlow,
  index: BenchmarkIndex,
  useWithdrawnCash: boolean,
) => ({
  timeline: timeline.map((el) => {
    const benchmark = el.benchmarkData[index];
    return {
      ...el,
      value: useWithdrawnCash ? benchmark.stockValue : benchmark.netStockValue,
      oneDayProfit: useWithdrawnCash ? benchmark.oneDayProfit : benchmark.netOneDayProfit,
    };
  }),
  cashFlow: useWithdrawnCash ? getCashFlowForBenchmarkComparison(cashFlow) : cashFlow,
});

export const getProfitOrLossForPeriod = (
  cashFlow: CashFlow,
  portfolioTimeline: ValueTimeline,
  windowStartDate: Date,
  windowEndDate: Date,
): number => {
  return getCashFlowForPeriod(cashFlow, portfolioTimeline, windowStartDate, windowEndDate).reduce(
    (sum, cf) => sum + cf.amount,
    0,
  );
};

/**
 * Calculates Simple Return (SR) as total gain over total invested capital.
 */
export function calculateSimpleReturn(
  valueTimeline: ValueTimeline,
  cashFlow: CashFlow,
  totalCapitalInvested: number,
  daysAgo: number,
): number {
  if (valueTimeline.length < 2) return 0;

  const profit = getProfitOrLossForPeriod(cashFlow, valueTimeline, addDays(new Date(), -daysAgo), new Date());

  return profit / totalCapitalInvested;
}

/**
 * Calculates Time-Weighted Return (TWR).
 */
export function calculateTWR(timeline: TWRValueTimeline, daysAgo: number): number {
  let twr = 1;
  const shift = Math.min(daysAgo, timeline.length);

  for (let i = timeline.length - shift; i < timeline.length; i++) {
    const pl = timeline[i].oneDayProfit;
    if (timeline[i].totalCapitalInvested > 0) {
      twr *= 1 + pl / timeline[i].totalCapitalInvested;
    }
  }
  return twr - 1;
}

/**
 * Calculates Money-Weighted Return (MWR) using IRR approximation.
 */
export function calculateMWR(portfolioTimeline: ValueTimeline, cashFlow: CashFlow, daysAgo: number): number {
  const today = new Date();
  const rate = xirr(getCashFlowForPeriod(cashFlow, portfolioTimeline, addDays(today, -daysAgo), today)).rate;
  return (1 + rate) ** 365 - 1;
}
