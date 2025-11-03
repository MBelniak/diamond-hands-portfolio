import { CashFlow, PortfolioAnalysis, PortfolioValue } from "@/xlsx-parser/types";
import { addDays } from "date-fns/addDays";
import { formatDate } from "@/lib/utils";
import { xirr } from "node-irr";
import { isAfter, isSameDay, startOfDay } from "date-fns";
import { isBefore } from "date-fns/isBefore";

export type ReturnMetric = "SR" | "MWR" | "TWR";

const getCashFlowForPeriod = (
  cashFlow: CashFlow,
  portfolioTimeline: PortfolioValue[],
  windowStartDate: Date,
  windowEndDate: Date,
) => {
  const cashFlowForPeriod = cashFlow
    .filter(({ date }) => {
      const eventDate = startOfDay(new Date(date));
      return !isBefore(eventDate, startOfDay(windowStartDate)) && !isAfter(eventDate, startOfDay(windowEndDate));
    })
    .map((operation) => ({ ...operation, amount: -operation.amount }));

  cashFlowForPeriod.unshift({
    date: formatDate(windowStartDate),
    amount: -(portfolioTimeline.find((el) => isSameDay(el.date, windowStartDate))?.portfolioValue ?? 0),
  });

  cashFlowForPeriod.push({
    date: formatDate(windowEndDate),
    amount: portfolioTimeline.find((el) => isSameDay(el.date, windowEndDate))?.portfolioValue ?? 0,
  });

  return cashFlowForPeriod;
};

const getProfitOrLossForPeriod = (
  cashFlow: CashFlow,
  portfolioTimeline: PortfolioValue[],
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
export function calculateSimpleReturn(portfolioAnalysis: PortfolioAnalysis, daysAgo: number): number {
  if (portfolioAnalysis.portfolioTimeline.length < 2) return 0;

  const last = portfolioAnalysis.portfolioTimeline.at(-1)!;

  const profit = getProfitFromOpenPositions(
    portfolioAnalysis.cashFlow,
    portfolioAnalysis.portfolioTimeline,
    addDays(new Date(), -daysAgo),
    new Date(),
  );

  return profit / last.totalCapitalInvested;
}

/**
 * Calculates Time-Weighted Return (TWR).
 */
export function calculateTWR(portfolioTimeline: PortfolioValue[], daysAgo: number): number {
  let twr = 1;
  const shift = Math.min(daysAgo, portfolioTimeline.length);

  for (let i = portfolioTimeline.length - shift; i < portfolioTimeline.length; i++) {
    const pl = portfolioTimeline[i].oneDayProfit;
    if (portfolioTimeline[i].totalCapitalInvested > 0) {
      twr *= 1 + pl / portfolioTimeline[i].totalCapitalInvested;
    }
  }
  return twr - 1;
}

/**
 * Calculates Money-Weighted Return (MWR) using IRR approximation.
 */
export function calculateMWR(portfolioTimeline: PortfolioValue[], cashFlow: CashFlow, daysAgo: number): number {
  const today = new Date();
  const windowStartDate = addDays(today, -daysAgo);
  const cashFlowWindow = getCashFlowForPeriod(cashFlow, portfolioTimeline, windowStartDate, today);

  console.dir(cashFlowWindow);
  console.dir("Sum: " + cashFlowWindow.reduce((sum, cf) => sum + cf.amount, 0));
  const rate = xirr(cashFlowWindow).rate;
  return (1 + rate) ** 365 - 1;
}

export function getProfitFromOpenPositions(
  cashFlow: CashFlow,
  portfolioTimeline: PortfolioValue[],
  windowStartDate: Date,
  windowEndDate: Date,
): number {
  return getProfitOrLossForPeriod(cashFlow, portfolioTimeline, windowStartDate, windowEndDate);
}
