import { CachedExchangeRates, ISODateString, PortfolioCurrency, TickerMarketData } from "@/lib/types";
import { format } from "date-fns";
import { injectable } from "inversify";
import { createClient, RedisClientType, SetOptions } from "redis";

export abstract class AbstractRedisClient {
  abstract initialize(): Promise<unknown>;
  abstract getRedisClient(): RedisClientType;
  abstract getCachedMarketData(ticker: string, startDate: Date): Promise<TickerMarketData | null>;
  abstract cacheMarketData(ticker: string, startDate: Date, tickerMarketData: TickerMarketData): Promise<void>;
  abstract getCachedExchangeRates(
    baseCurrency: PortfolioCurrency,
    quoteCurrency: string,
    windowStart: ISODateString,
  ): Promise<CachedExchangeRates | null>;
  /** Without `ttlSeconds` the entry never expires. */
  abstract cacheExchangeRates(
    baseCurrency: PortfolioCurrency,
    quoteCurrency: string,
    windowStart: ISODateString,
    exchangeRates: CachedExchangeRates,
    ttlSeconds?: number,
  ): Promise<void>;
}

@injectable()
export class RedisClient implements AbstractRedisClient {
  private redisClient: RedisClientType;
  private connectPromise: Promise<unknown> | null = null;

  constructor() {
    this.redisClient = createClient({ url: process.env.REDIS_URL });
    this.redisClient.on("error", (err) => console.error("Redis client error:", err));
  }

  initialize(): Promise<unknown> {
    if (this.redisClient.isOpen) return Promise.resolve();
    if (!this.connectPromise) {
      this.connectPromise = this.redisClient.connect().catch((err) => {
        this.connectPromise = null;
        throw err;
      });
    }
    return this.connectPromise;
  }

  getRedisClient(): RedisClientType {
    return this.redisClient;
  }

  async getCachedMarketData(ticker: string, startDate: Date): Promise<TickerMarketData | null> {
    await this.initialize();
    if (await this.redisClient.exists(this.getStockPricesRedisKey(ticker, startDate))) {
      return JSON.parse((await this.redisClient.get(this.getStockPricesRedisKey(ticker, startDate))) as string);
    } else {
      return null;
    }
  }

  async cacheMarketData(ticker: string, startDate: Date, tickerMarketData: TickerMarketData): Promise<void> {
    await this.initialize();
    await this.redisClient.set(
      this.getStockPricesRedisKey(ticker, startDate),
      JSON.stringify(tickerMarketData),
      REDIS_EXPIRE_IN_HOUR,
    );
  }

  async getCachedExchangeRates(
    baseCurrency: PortfolioCurrency,
    quoteCurrency: string,
    windowStart: ISODateString,
  ): Promise<CachedExchangeRates | null> {
    await this.initialize();
    const cached = await this.redisClient.get(this.getExchangeRatesRedisKey(baseCurrency, quoteCurrency, windowStart));
    return cached ? JSON.parse(cached) : null;
  }

  async cacheExchangeRates(
    baseCurrency: PortfolioCurrency,
    quoteCurrency: string,
    windowStart: ISODateString,
    exchangeRates: CachedExchangeRates,
    ttlSeconds?: number,
  ): Promise<void> {
    await this.initialize();
    await this.redisClient.set(
      this.getExchangeRatesRedisKey(baseCurrency, quoteCurrency, windowStart),
      JSON.stringify(exchangeRates),
      ttlSeconds ? { expiration: { type: "EX", value: ttlSeconds } } : undefined,
    );
  }

  private getStockPricesRedisKey(symbol: string, startDate: Date): string {
    return `priceCache-${symbol}-${format(startDate, "yyyy-MM-dd")}`;
  }

  private getExchangeRatesRedisKey(
    baseCurrency: PortfolioCurrency,
    quoteCurrency: string,
    windowStart: ISODateString,
  ): string {
    return `exchangeRates-${baseCurrency}${quoteCurrency}-${windowStart}`;
  }
}

export const REDIS_EXPIRE_IN_HOUR: SetOptions = {
  expiration: {
    type: "EX",
    value: 60 * 60, // 1 hour in seconds
  },
};
