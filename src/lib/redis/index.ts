import { format } from "date-fns/format";
import { SetOptions } from "redis";

export function getStockPricesRedisKey(symbol: string, startDate: Date, endDate: Date): string {
  return `priceCache-${symbol}-${format(startDate, "yyyy-MM-dd")}-${format(endDate, "yyyy-MM-dd")}`;
}

export function getExchangeRatesRedisKey(date: Date): string {
  return `exchangeRatesCache-${format(date, "yyyy-MM-dd")}`;
}

export const REDIS_EXPIRE_IN_DAY: SetOptions = {
  expiration: {
    type: "EX",
    value: 60 * 60 * 24, // 1 day in seconds
  },
};
