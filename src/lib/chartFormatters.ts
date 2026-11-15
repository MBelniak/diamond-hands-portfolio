import { differenceInCalendarDays, format, parseISO } from "date-fns";

/** Minimum horizontal gap (px) between date ticks so the axis never gets crowded. */
export const DATE_AXIS_MIN_TICK_GAP = 64;

/**
 * Returns a tick formatter for a date axis whose granularity adapts to the visible span:
 * long ranges show "Mar 2025", shorter ones show "12 Mar".
 */
export function getDateTickFormatter(firstDate?: string, lastDate?: string) {
  const spanDays =
    firstDate && lastDate ? Math.abs(differenceInCalendarDays(parseISO(lastDate), parseISO(firstDate))) : 0;
  const pattern = spanDays > 180 ? "MMM yyyy" : "d MMM";

  return (value: string) => {
    const date = parseISO(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : format(date, pattern);
  };
}

const compactFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const formatCompactNumber = (value: number) => compactFormatter.format(value);

/** Shared style for recharts' default tooltip so it matches the flat, outlined card look. */
export const chartTooltipStyle = {
  borderRadius: 0,
  border: "1px solid var(--border)",
  background: "var(--tooltip-background)",
  color: "var(--foreground)",
  fontSize: "0.8125rem",
};
