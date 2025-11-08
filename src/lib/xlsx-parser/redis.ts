import { format } from "date-fns/format";

export function getStockPricesRedisKey(symbol: string, startDate: Date, endDate: Date): string {
  return `priceCache-${symbol}-${format(startDate, "yyyy-MM-dd")}-${format(endDate, "yyyy-MM-dd")}`;
}

export function getExchangeRatesRedisKey(date: Date): string {
  return `exchangeRatesCache-${format(date, "yyyy-MM-dd")}`;
}
