// @ts-expect-error no typings for this file
import XLSX from "xlsx/xlsx.js";
import { isBefore, isSameDay } from "date-fns";
import { Currency, PortfolioCurrency, TickerQuote } from "@/lib/types";
import { omit } from "lodash-es";

export class XlsxHelper {
  static parseXLSXDate(dateStr: string | number): Date {
    const dateObjectParsed = XLSX.SSF.parse_date_code(dateStr as number);
    return new Date(
      dateObjectParsed.y,
      dateObjectParsed.m - 1,
      dateObjectParsed.d,
      dateObjectParsed.H || 0,
      dateObjectParsed.M || 0,
      dateObjectParsed.S || 0,
    );
  }

  // eslint-disable-next-line
  static parseSheetToJson(workbook: any, sheetName: string): Record<string, string | number>[] {
    const sheet = workbook.Sheets[sheetName];
    const jsonData: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = jsonData.at(4);
    if (!headers || headers.length === 0) {
      console.warn(`${sheetName} sheet is missing headers. Skipping cash events parsing.`);
      return [];
    }
    // Data starts right after the headers. The sheets are padded with blank rows and "Cash Operations" has a
    // "Total" row that isn't necessarily last, so don't drop rows by position - callers filter out rows
    // without a date, which covers both blank and "Total" rows.
    return jsonData.slice(5).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  }
}

/**
 * Extracts traded volume and price from a "Cash Operations" comment. Supported formats:
 * - "OPEN BUY 3/3.5669 @ 79.4290" (older reports: partial volume / total volume)
 * - "OPEN BUY IONQ.US 8/8.4244 @ 31.02" (newer reports include the ticker)
 * - "CLOSE BUY 0.8915 @ 224.34", "CLOSE BUY IGLN.UK 0.7734 @ 77.1350"
 * - "Correction: BUY 0.2346 @ 438.42"
 */
export function parseStockVolumeAndPriceFromComment(comment: string): { volume: number; price: number } {
  const match = /(?:OPEN|CLOSE) BUY (?:\S+ )?(\d+(?:\.\d+)?)(?:\/\d+(?:\.\d+)?)? @ (\d+(?:\.\d+)?)/.exec(comment);
  if (match) {
    return { volume: Number(match[1]), price: Number(match[2]) };
  }
  const correctionMatch = /BUY (?:\S+ )?(\d+(?:\.\d+)?) @ (\d+(?:\.\d+)?)/.exec(comment);
  if (correctionMatch) {
    return { volume: Number(correctionMatch[1]), price: Number(correctionMatch[2]) };
  }
  return { volume: 0, price: 0 };
}

export const CLOSED_POSITION_ID_SEPARATOR = ":";

/**
 * Builds ids for "Closed Positions" rows that are unique within a report and stable across reports:
 * `<Position ID>:<close time in whole seconds>:<volume>`, with `:<n>` appended to the n-th repeat of an
 * otherwise identical row. The close time is taken from the raw Excel date serial, so the id doesn't depend on
 * the server's time zone.
 *
 * The Position ID alone isn't unique - XTB splits a position into several rows (whole and fractional shares,
 * partial closes).
 */
export function getClosedPositionRowIds(
  rows: { positionId: string | number | undefined; closeTime: string | number; volume: string | number | undefined }[],
): string[] {
  const occurrences = new Map<string, number>();
  return rows.map(({ positionId, closeTime, volume }) => {
    const closeTimeInSeconds = Math.round(Number(closeTime) * 24 * 60 * 60);
    const baseId = [String(positionId ?? ""), closeTimeInSeconds, Number(volume || 0)].join(
      CLOSED_POSITION_ID_SEPARATOR,
    );
    const occurrence = occurrences.get(baseId) ?? 0;
    occurrences.set(baseId, occurrence + 1);
    return occurrence === 0 ? baseId : `${baseId}${CLOSED_POSITION_ID_SEPARATOR}${occurrence}`;
  });
}

/** Position ID of a closed position event - works for both current and legacy (Position ID only) ids. */
export function getPositionIdFromClosedPositionEventId(eventId: string): string {
  return eventId.split(CLOSED_POSITION_ID_SEPARATOR)[0];
}

/** Events stored before closed position rows got unique ids were identified by the bare Position ID. */
export function isLegacyClosedPositionEventId(eventId: string): boolean {
  return !eventId.includes(CLOSED_POSITION_ID_SEPARATOR);
}

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
  if (rates[fromCurrency + toCurrency]) {
    return price * rates[fromCurrency + toCurrency];
  }
  return price;
}

export const getPricesFromTickerQuote = (tickerQuote: TickerQuote): Exclude<TickerQuote, "volume"> => {
  return omit(tickerQuote, ["volume"]) as Exclude<TickerQuote, "volume">;
};
