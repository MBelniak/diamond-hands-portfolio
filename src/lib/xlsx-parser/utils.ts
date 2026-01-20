import { isBefore, isSameDay } from "date-fns";
import { Currency, PortfolioCurrency, TickerQuote } from "@/lib/types";
import { omit } from "lodash-es";

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
  if (symbol === "DE40") {
    return "^GDAXI"; //DAX index
  }
  if (symbol === "US100") {
    return "^NDX"; // us 100 index
  }
  return symbol.split(".")[0] + symbolToYahooSuffix(symbol);
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

/**
 * Converts a price in a given currency to USD using provided rates.
 * @param price - price in original currency
 * @param rates - records of currency rates { EUR: 1.08, GBP: 1.25, ... }
 * @param fromCurrency
 * @param toCurrency
 */
export function convertToCurrency(
  price: number | undefined,
  rates: Record<Currency, number>,
  fromCurrency: string,
  toCurrency: PortfolioCurrency,
): number | undefined {
  if (!fromCurrency || fromCurrency === toCurrency || price === undefined) {
    return price;
  }
  if (fromCurrency === "GBp") {
    // 100 GBp = 1 GBP
    const gbpPrice = price / 100;
    return rates[`${toCurrency}GBP`] ? gbpPrice * (1 / rates[`${toCurrency}GBP`]) : gbpPrice;
  }
  if (rates[toCurrency + fromCurrency]) {
    return price * (1 / rates[toCurrency + fromCurrency]);
  }
  return price;
}

export const getPricesFromTickerQuote = (tickerQuote: TickerQuote): Exclude<TickerQuote, "volume"> => {
  return omit(tickerQuote, ["volume"]) as Exclude<TickerQuote, "volume">;
};
