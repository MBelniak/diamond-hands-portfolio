import { isBefore, isSameDay } from "date-fns";
import type { Split } from "@/lib/types";

/** A split affects anything dated before (or on) its effective date. */
export const isSplitApplicable = (split: Split, date: Date): boolean =>
  isBefore(date, new Date(split.effective_date)) || isSameDay(date, new Date(split.effective_date));

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
