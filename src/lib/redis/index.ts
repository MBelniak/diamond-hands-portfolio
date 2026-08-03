import { format } from "date-fns/format";
import { SetOptions } from "redis";
import { PortfolioCurrency } from "@/lib/types";

export function getStockPricesRedisKey(symbol: string, startDate: Date): string {
  return `priceCache-${symbol}-${format(startDate, "yyyy-MM-dd")}`;
}

export function getExchangeRatesRedisKey(date: Date, baseCurrency: PortfolioCurrency): string {
  return `exchangeRatesCache-${format(date, "yyyy-MM-dd")}-${baseCurrency}`;
}

export const REDIS_EXPIRE_IN_HOUR: SetOptions = {
  expiration: {
    type: "EX",
    value: 60 * 60, // 1 hour in seconds
  },
};
