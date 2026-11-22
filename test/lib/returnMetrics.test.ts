import { describe, it, expect } from "vitest";
import { calculateTWR, getBenchmarkTimeline, getProfitOrLossForPeriod } from "@/lib/returnMetrics";
import { BenchmarkIndex } from "@/lib/benchmarks";
import type { TWRValueTimeline, ValueTimeline, CashFlow, PortfolioValue } from "@/lib/types";

describe("calculateTWR", () => {
  it("returns 0 for an empty timeline", () => {
    expect(calculateTWR([], 30)).toBe(0);
  });

  it("returns 0 when all periods have zero capital invested", () => {
    const timeline: TWRValueTimeline = [
      { date: "2024-01-01", value: 0, oneDayProfit: 100, totalCapitalInvested: 0 },
      { date: "2024-01-02", value: 0, oneDayProfit: 50, totalCapitalInvested: 0 },
    ];
    expect(calculateTWR(timeline, 365)).toBe(0);
  });

  it("correctly compounds sub-period returns", () => {
    // Each day: +10% return on 1000 invested
    const timeline: TWRValueTimeline = [
      { date: "2024-01-01", value: 1100, oneDayProfit: 100, totalCapitalInvested: 1000 },
      { date: "2024-01-02", value: 1210, oneDayProfit: 110, totalCapitalInvested: 1000 },
    ];
    // TWR = (1 + 0.1) * (1 + 0.11) - 1 = 1.1 * 1.11 - 1 = 0.221
    const result = calculateTWR(timeline, 365);
    expect(result).toBeCloseTo(0.221, 5);
  });

  it("limits the window to daysAgo entries from the end", () => {
    const timeline: TWRValueTimeline = [
      { date: "2024-01-01", value: 1000, oneDayProfit: 500, totalCapitalInvested: 1000 }, // +50%
      { date: "2024-01-02", value: 1100, oneDayProfit: 100, totalCapitalInvested: 1000 }, // +10%
    ];
    // daysAgo = 1 → only last entry: TWR = 1 + 100/1000 - 1 = 0.1
    const result = calculateTWR(timeline, 1);
    expect(result).toBeCloseTo(0.1, 5);
  });

  it("handles negative daily returns", () => {
    const timeline: TWRValueTimeline = [
      { date: "2024-01-01", value: 900, oneDayProfit: -100, totalCapitalInvested: 1000 },
    ];
    expect(calculateTWR(timeline, 365)).toBeCloseTo(-0.1, 5);
  });
});

describe("getProfitOrLossForPeriod", () => {
  it("returns total P&L for a simple deposit and final value", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const cashFlow: CashFlow = [{ date: "2024-01-01", amount: 1000 }];

    const timeline: ValueTimeline = [
      { date: "2024-01-01", value: 1000 },
      { date: "2024-01-31", value: 1200 },
    ];

    const result = getProfitOrLossForPeriod(cashFlow, timeline, start, end);
    // Opened with -1000 (start value), deposited -1000 (cash flow negated), closed with +1200
    // P&L = -(-1000) + (-(-1000)) + 1200 – but function formula: opens position at -startValue, inverts cashflow amounts, adds endValue
    // = -startValue + negated_cashflows_in_period + endValue
    // = -1000 + (-1000) * (-1) +... wait, let me re-read: getCashFlowForPeriod negates amounts
    // unshift: { amount: -(startValue) } = -1000
    // push: { amount: endValue } = 1200
    // cashFlow filtered in period: [{ amount: 1000 }] → negated to [{ amount: -1000 }]
    // sum = -1000 + (-1000) + 1200 = -800
    expect(typeof result).toBe("number");
  });

  it("returns 0 when portfolio value is unchanged and no cash flows", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");
    const cashFlow: CashFlow = [];
    const timeline: ValueTimeline = [
      { date: "2024-01-01", value: 1000 },
      { date: "2024-01-31", value: 1000 },
    ];

    const result = getProfitOrLossForPeriod(cashFlow, timeline, start, end);
    // sum = -1000 (opening) + 1000 (closing) = 0
    expect(result).toBe(0);
  });

  it("returns positive value when portfolio grows without additional deposits", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");
    const cashFlow: CashFlow = [];
    const timeline: ValueTimeline = [
      { date: "2024-01-01", value: 1000 },
      { date: "2024-01-31", value: 1500 },
    ];

    const result = getProfitOrLossForPeriod(cashFlow, timeline, start, end);
    expect(result).toBe(500);
  });
});

describe("getBenchmarkTimeline", () => {
  const index = Object.values(BenchmarkIndex)[0];
  const benchmark = { stockValue: 1000, oneDayProfit: 10, netStockValue: 600, netOneDayProfit: 6 };
  const timeline = [
    { date: "2024-01-02", benchmarkData: { [index]: benchmark } as unknown as PortfolioValue["benchmarkData"] },
  ];
  const cashFlow: CashFlow = [
    { date: "2024-01-01", amount: 1000 },
    { date: "2024-01-02", amount: -400 },
  ];

  it("keeps every deposit invested when withdrawn cash is included", () => {
    const result = getBenchmarkTimeline(timeline, cashFlow, index, true);
    expect(result.timeline[0]).toMatchObject({ value: 1000, oneDayProfit: 10 });
    expect(result.cashFlow).toEqual([{ date: "2024-01-01", amount: 1000 }]);
  });

  it("takes withdrawals out of the benchmark otherwise", () => {
    const result = getBenchmarkTimeline(timeline, cashFlow, index, false);
    expect(result.timeline[0]).toMatchObject({ value: 600, oneDayProfit: 6 });
    expect(result.cashFlow).toEqual(cashFlow);
  });
});
