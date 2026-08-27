import { ExchangeRates, PortfolioCurrency, TickerMarketData } from "@/lib/types";
import { format } from "date-fns";
import { injectable } from "inversify";
import { createClient, RedisClientType, SetOptions } from "redis";

export abstract class AbstractRedisClient {
  abstract initialize(): Promise<unknown>;
  abstract getRedisClient(): RedisClientType;
  abstract getCachedMarketData(ticker: string, startDate: Date): Promise<TickerMarketData | null>;
  abstract cacheMarketData(ticker: string, startDate: Date, tickerMarketData: TickerMarketData): Promise<void>;
  abstract getCachedExchangeRates(date: Date, baseCurrency: PortfolioCurrency): Promise<ExchangeRates | null>;
  abstract cacheExchangeRates(date: Date, baseCurrency: PortfolioCurrency, exchangeRates: ExchangeRates): Promise<void>;
}

@injectable()
export class RedisClient implements AbstractRedisClient {
  private redisClient: RedisClientType;

  constructor() {
    this.redisClient = createClient({ url: process.env.REDIS_URL });
  }

  initialize(): Promise<unknown> {
    return this.redisClient.connect();
  }

  getRedisClient(): RedisClientType {
    return this.redisClient;
  }

  async getCachedMarketData(ticker: string, startDate: Date): Promise<TickerMarketData | null> {
    if (await this.redisClient.exists(this.getStockPricesRedisKey(ticker, startDate))) {
      return JSON.parse((await this.redisClient.get(this.getStockPricesRedisKey(ticker, startDate))) as string);
    } else {
      return null;
    }
  }

  async cacheMarketData(ticker: string, startDate: Date, tickerMarketData: TickerMarketData): Promise<void> {
    await this.redisClient.set(
      this.getStockPricesRedisKey(ticker, startDate),
      JSON.stringify(tickerMarketData),
      REDIS_EXPIRE_IN_HOUR,
    );
  }

  async getCachedExchangeRates(date: Date, baseCurrency: PortfolioCurrency): Promise<ExchangeRates | null> {
    if (await this.redisClient.exists(this.getExchangeRatesRedisKey(date, baseCurrency))) {
      return JSON.parse((await this.redisClient.get(this.getExchangeRatesRedisKey(date, baseCurrency))) as string);
    } else {
      return null;
    }
  }

  async cacheExchangeRates(date: Date, baseCurrency: PortfolioCurrency, exchangeRates: ExchangeRates): Promise<void> {
    await this.redisClient.set(
      this.getExchangeRatesRedisKey(date, baseCurrency),
      JSON.stringify(exchangeRates),
      REDIS_EXPIRE_IN_HOUR,
    );
  }

  private getStockPricesRedisKey(symbol: string, startDate: Date): string {
    return `priceCache-${symbol}-${format(startDate, "yyyy-MM-dd")}`;
  }

  private getExchangeRatesRedisKey(date: Date, baseCurrency: PortfolioCurrency): string {
    return `exchangeRatesCache-${format(date, "yyyy-MM-dd")}-${baseCurrency}`;
  }
}

export const REDIS_EXPIRE_IN_HOUR: SetOptions = {
  expiration: {
    type: "EX",
    value: 60 * 60, // 1 hour in seconds
  },
};
