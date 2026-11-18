import { addDays, parseISO } from "date-fns";
import { formatDate } from "@/lib/utils";
import type { ExchangeRates, ISODateString } from "@/lib/types";

export type RateWindow = {
  start: ISODateString;
  end: ISODateString;
  /** The window ended before today, so its rates won't change anymore */
  complete: boolean;
};

/**
 * Splits the period from `startDate` until today into consecutive 365-day windows, each fetched and cached on its
 * own. Boundaries only depend on `startDate`, so every past window keeps its cache key.
 */
export function getRateWindows(startDate: Date, today: Date): RateWindow[] {
  const todayKey = formatDate(today);
  const windows: RateWindow[] = [];
  let end = addDays(startDate, 365);
  let start = startDate;

  while (formatDate(start) <= todayKey) {
    const endKey = formatDate(end);
    const complete = endKey < todayKey;
    windows.push({ start: formatDate(start), end: complete ? endKey : todayKey, complete });
    start = end;
    end = addDays(end, 365);
  }
  return windows;
}

/** Rates of the given day, or of the closest earlier day (up to a week back) when the day has none. */
export function getRatesForDate(exchangeRates: ExchangeRates, date: ISODateString | Date): Record<string, number> {
  if (typeof date === "string" && exchangeRates[date]) {
    return exchangeRates[date]; // fast path: called for every quote
  }
  const day = typeof date === "string" ? parseISO(date) : date;
  for (let daysBack = 0; daysBack <= 7; daysBack++) {
    const rates = exchangeRates[formatDate(addDays(day, -daysBack))];
    if (rates) {
      return rates;
    }
  }
  return {};
}
