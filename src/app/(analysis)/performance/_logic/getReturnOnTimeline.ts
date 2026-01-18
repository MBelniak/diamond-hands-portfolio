import {
  calculateMWR,
  calculateSimpleReturn,
  calculateTWR,
  getProfitOrLossForPeriod,
  ReturnMetric,
} from "@/lib/returnMetrics";
import { addDays } from "date-fns/addDays";
import { CashFlow, TWRValueTimeline } from "@/lib/types";
import { TimePeriod, timePeriodEnumToDuration } from "@/app/(analysis)/performance/_types/TimePeriod";
import { getDayOfYear } from "date-fns";

export type ReturnMetricsOnBenchmark = Record<
  TimePeriod,
  {
    return: number;
    totalProfit: number;
  }
>;

export const getReturnOnTimeline = (
  timeline: TWRValueTimeline,
  cashFlow: CashFlow,
  totalCapitalInvested: number,
  periods: TimePeriod[],
  selectedReturnMetric: ReturnMetric,
): ReturnMetricsOnBenchmark => {
  return periods.reduce((acc, period) => {
    let periodLength = timePeriodEnumToDuration[period];
    if (period === TimePeriod.YearToDate) {
      periodLength = getDayOfYear(new Date());
    } else if (period === TimePeriod.All) {
      periodLength = timeline.length - 1;
    }

    const returnMetrics = {
      SR: calculateSimpleReturn(timeline, cashFlow, totalCapitalInvested, periodLength) * 100,
      TWR: calculateTWR(timeline, periodLength) * 100,
      MWR: (calculateMWR(timeline, cashFlow, periodLength) * 100) / (365 / periodLength),
    };
    const totalProfit = getProfitOrLossForPeriod(cashFlow, timeline, addDays(new Date(), -periodLength), new Date());

    return {
      ...acc,
      [period]: {
        return: returnMetrics[selectedReturnMetric],
        totalProfit,
      },
    };
  }, {} as ReturnMetricsOnBenchmark);
};
