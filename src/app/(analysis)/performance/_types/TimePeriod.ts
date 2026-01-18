export enum TimePeriod {
  OneWeek = "1w",
  OneMonth = "1m",
  ThreeMonths = "3m",
  SixMonths = "6m",
  YearToDate = "YTD",
  OneYear = "1y",
  TwoYears = "2y",
  FiveYears = "5y",
  All = "All",
}

export const timePeriodEnumToDuration: Record<TimePeriod, number> = {
  [TimePeriod.OneWeek]: 7,
  [TimePeriod.OneMonth]: 30,
  [TimePeriod.ThreeMonths]: 90,
  [TimePeriod.SixMonths]: 180,
  [TimePeriod.YearToDate]: 0, // Special case, handled separately
  [TimePeriod.OneYear]: 365,
  [TimePeriod.TwoYears]: 2 * 365,
  [TimePeriod.FiveYears]: 5 * 365 + 1,
  [TimePeriod.All]: -1, // Indicates all available data
} as const;

export const timePeriodEnumToLabel: Record<TimePeriod, string> = {
  [TimePeriod.OneWeek]: "Week",
  [TimePeriod.OneMonth]: "Month",
  [TimePeriod.ThreeMonths]: "3M",
  [TimePeriod.SixMonths]: "6M",
  [TimePeriod.YearToDate]: "YTD",
  [TimePeriod.OneYear]: "1Y",
  [TimePeriod.TwoYears]: "2Y",
  [TimePeriod.FiveYears]: "5Y",
  [TimePeriod.All]: "All",
} as const;
