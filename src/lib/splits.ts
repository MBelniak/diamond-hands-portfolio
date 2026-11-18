import { isBefore, isSameDay } from "date-fns";
import type { Split } from "@/lib/types";

/**
 * A split affects anything that happened before it took effect. Yahoo reports the split at the market open of the
 * first post-split session, so e.g. XTB's pre-open cash-out of fractional positions is pre-split, while a trade
 * later that day is already post-split. Splits cached without the exact time fall back to the whole effective day.
 */
export const isSplitApplicable = (split: Split, date: Date): boolean => {
  if (split.effective_time) {
    return isBefore(date, new Date(split.effective_time));
  }
  return isBefore(date, new Date(split.effective_date)) || isSameDay(date, new Date(split.effective_date));
};

/**
 * Cumulative factor of all splits that happened after `date`.
 * Multiply a raw (as-traded) volume by it, or divide a raw price by it, to get split-adjusted values
 * comparable with today's (split-adjusted) quotes.
 */
export function getSplitFactor(splits: Split[] | undefined, date: Date | string): number {
  if (!splits?.length) {
    return 1;
  }
  const eventDate = typeof date === "string" ? new Date(date) : date;
  return splits
    .filter((split) => split.split_factor && isSplitApplicable(split, eventDate))
    .reduce((factor, split) => factor * split.split_factor, 1);
}
