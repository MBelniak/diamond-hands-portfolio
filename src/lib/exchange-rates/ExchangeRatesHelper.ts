import { ExchangeRates } from "../types";
import { setTimeout } from "node:timers/promises";
import { PortfolioCurrency } from "../types";
import { RedisClientType } from "redis";
import { getExchangeRatesRedisKey, REDIS_EXPIRE_IN_DAY } from "@/lib/redis";
import { addDays, isBefore } from "date-fns";
import { formatDate } from "@/lib/utils";

export class ExchangeRatesHelper {
  private currencylayerApiKey;
  constructor(private redisClient: RedisClientType) {
    if (!process.env.EXCHANGE_RATES_API_KEY) {
      throw new Error(
        "Please set the EXCHANGE_RATES_API_KEY environment variable in the .env file. See https://currencylayer.com/documentation",
      );
    }

    this.currencylayerApiKey = process.env.EXCHANGE_RATES_API_KEY;
  }

  async fetchExchangeRates(
    currencies: Set<string>,
    baseCurrency: PortfolioCurrency,
    startDate: Date,
  ): Promise<ExchangeRates> {
    const today = new Date();
    if (await this.redisClient.exists(getExchangeRatesRedisKey(today, baseCurrency))) {
      return JSON.parse((await this.redisClient.get(getExchangeRatesRedisKey(today, baseCurrency))) as string);
    }

    if (currencies.has("GBp")) {
      currencies.delete("GBp");
      currencies.add("GBP");
    }

    let exchangeRates = {};
    let endDate = addDays(startDate, 365);
    while (isBefore(endDate, addDays(new Date(), 365))) {
      const searchParams = new URLSearchParams();
      searchParams.set("start_date", formatDate(addDays(endDate, -365)));
      searchParams.set("end_date", formatDate(isBefore(endDate, new Date()) ? endDate : new Date()));
      searchParams.set("access_key", this.currencylayerApiKey);
      searchParams.set(
        "currencies",
        Array.from(currencies)
          .filter((c) => c !== baseCurrency)
          .join(","),
      );
      searchParams.set("source", baseCurrency);

      const finalURL = `https://apilayer.net/timeframe?${searchParams.toString()}`;
      console.log("Fetching from " + finalURL);
      const response = await fetch(finalURL);

      if (response.ok) {
        const data = (await response.json()).quotes as ExchangeRates;
        exchangeRates = { ...exchangeRates, ...data };
        endDate = addDays(endDate, 365);
      } else {
        throw new Error("Failed to fetch exchange rates:" + (await response.text()));
      }

      await setTimeout(1000); // To avoid hitting rate limits
    }

    await this.redisClient.set(
      getExchangeRatesRedisKey(today, baseCurrency),
      JSON.stringify(exchangeRates),
      REDIS_EXPIRE_IN_DAY,
    );
    return exchangeRates;
  }
}
