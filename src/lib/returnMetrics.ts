import { CashFlow, TWRValueTimeline, ValueTimeline } from "@/lib/types";
import { addDays } from "date-fns/addDays";
import { formatDate } from "@/lib/utils";
import { xirr } from "node-irr";
import { isAfter, isSameDay, startOfDay } from "date-fns";
import { isBefore } from "date-fns/isBefore";

export type ReturnMetric = "SR" | "MWR" | "TWR";

const getCashFlowForPeriod = (cashFlow: CashFlow, windowStartDate: Date, windowEndDate: Date) => {
  return cashFlow
    .filter(({ date }) => {
      const eventDate = startOfDay(new Date(date));
      return !isBefore(eventDate, startOfDay(windowStartDate)) && !isAfter(eventDate, startOfDay(windowEndDate));
    })
    .map((operation) => ({ ...operation, amount: -operation.amount }));
};

export const getCashFlowForBenchmarkComparison = (cashFlow: CashFlow) => {
  return cashFlow.filter((entry) => entry.amount >= 0);
};

export const getProfitOrLossForPeriod = (
  cashFlow: CashFlow,
  portfolioTimeline: ValueTimeline,
  windowStartDate: Date,
  windowEndDate: Date,
): number => {
  const cashOperations = getCashFlowForPeriod(cashFlow, windowStartDate, windowEndDate);

  cashOperations.unshift({
    date: formatDate(windowStartDate),
    amount: -(portfolioTimeline.find((el) => isSameDay(el.date, windowStartDate))?.value ?? 0),
  });

  cashOperations.push({
    date: formatDate(windowEndDate),
    amount: portfolioTimeline.find((el) => isSameDay(el.date, windowEndDate))?.value ?? 0,
  });

  return cashOperations.reduce((sum, cf) => sum + cf.amount, 0);
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
  const windowStartDate = addDays(today, -daysAgo);
  const cashFlowWindow = getCashFlowForPeriod(cashFlow, windowStartDate, today);

  cashFlowWindow.unshift({
    date: formatDate(windowStartDate),
    amount: -(portfolioTimeline.find((el) => isSameDay(el.date, windowStartDate))?.value ?? 0),
  });

  cashFlowWindow.push({
    date: formatDate(today),
    amount: portfolioTimeline.find((el) => isSameDay(el.date, today))?.value ?? 0,
  });

  const rate = xirr(cashFlowWindow).rate;
  return (1 + rate) ** 365 - 1;
}
