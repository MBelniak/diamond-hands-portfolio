import { isBefore, isSameDay } from "date-fns";
import { format } from "date-fns/format";

export function symbolToYahooSuffix(symbol: string): string {
  if (symbol.endsWith(".UK")) {
    return ".L";
  }
  if (symbol.endsWith(".NL")) {
    return ".AS";
  }
  if (symbol.endsWith(".US")) {
    return "";
  }
  return symbol.includes(".") ? "." + symbol.split(".").at(-1)! : "";
}

export function getStockAPISymbol(symbol: string) {
  if (symbol === "OIL") {
    return "CL=F"; // WTI Crude Oil Futures
  }
  if (symbol === "GOLD") {
    return "GC=F"; // Gold Futures
  }
  if (symbol === "US100") {
    return "^NDX"; // us 100 index
  }
  return symbol.split(".")[0] + symbolToYahooSuffix(symbol);
}

export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Function generates an array of dates from the start date to the end date (inclusive)
 */
export function getDateRange(start: Date, end: Date): Date[] {
  const arr = [];
  const nextDate = new Date(start);
  while (isBefore(nextDate, end) || isSameDay(nextDate, end)) {
    arr.push(new Date(nextDate));
    nextDate.setDate(nextDate.getDate() + 1);
  }
  return arr;
}
