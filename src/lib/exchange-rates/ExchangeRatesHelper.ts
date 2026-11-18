import { ExchangeRates } from "../types";
import { PortfolioCurrency } from "../types";
import { AbstractRedisClient } from "@/lib/redis";
import iocContainer from "@/iocContainer";
import { getRateWindows, RateWindow } from "@/lib/exchange-rates/rateWindows";

/** The current (still changing) window is re-fetched when its cached copy is older than this. */
const CURRENT_WINDOW_MAX_AGE_MS = 60 * 60 * 1000;
/** A stale copy of the current window is kept this long for cache-only reads. */
const CURRENT_WINDOW_TTL_SECONDS = 7 * 24 * 60 * 60;

export class ExchangeRatesHelper {
  /**
   * Daily rates of the given currencies against the base currency, cached per currency pair and 365-day window.
   * Past windows never change, so they're cached for good; only the current one is re-fetched (hourly).
   * With `cacheOnly`, never calls the API (any cached copy will do; uncached windows are skipped) - so single-ticker
   * requests can't flood the API.
   */
  async getExchangeRates(
    currencies: Set<string>,
    baseCurrency: PortfolioCurrency,
    startDate: Date,
    { cacheOnly = false }: { cacheOnly?: boolean } = {},
  ): Promise<ExchangeRates> {
    const now = new Date();
    const redisClient = iocContainer.get<AbstractRedisClient>(AbstractRedisClient);
    const quoteCurrencies = Array.from(
      new Set(
        Array.from(currencies)
          .map((currency) => (currency === "GBp" ? "GBP" : currency))
          .filter((currency) => currency !== baseCurrency),
      ),
    );

    const exchangeRates: ExchangeRates = {};
    if (quoteCurrencies.length === 0) {
      return exchangeRates;
    }

    for (const window of getRateWindows(startDate, now)) {
      const missingCurrencies: string[] = [];

      await Promise.all(
        quoteCurrencies.map(async (currency) => {
          const cached = await redisClient.getCachedExchangeRates(baseCurrency, currency, window.start);
          const isUpToDate =
            cached &&
            (window.complete
              ? cached.complete
              : now.getTime() - new Date(cached.fetchedAt).getTime() < CURRENT_WINDOW_MAX_AGE_MS);
          if (cached && (cacheOnly || isUpToDate)) {
            mergeExchangeRates(exchangeRates, cached.rates);
          } else {
            missingCurrencies.push(currency);
          }
        }),
      );

      if (missingCurrencies.length === 0) {
        continue;
      }
      if (cacheOnly) {
        // Same outcome as a failed fetch for /api/portfolio: prices stay unconverted for these dates
        console.warn(
          `Exchange rates ${baseCurrency}/${missingCurrencies.join(",")} from ${window.start} are not cached.`,
        );
        continue;
      }

      const fetchedRates = await this.fetchExchangeRates(missingCurrencies, baseCurrency, window);
      mergeExchangeRates(exchangeRates, fetchedRates);

      await Promise.all(
        missingCurrencies.map((currency) =>
          redisClient.cacheExchangeRates(
            baseCurrency,
            currency,
            window.start,
            {
              rates: pickCurrencyPair(fetchedRates, `${baseCurrency}${currency}`),
              complete: window.complete,
              fetchedAt: now.toISOString(),
            },
            window.complete ? undefined : CURRENT_WINDOW_TTL_SECONDS,
          ),
        ),
      );
    }

    return exchangeRates;
  }

  private async fetchExchangeRates(
    currencies: string[],
    baseCurrency: PortfolioCurrency,
    window: RateWindow,
  ): Promise<ExchangeRates> {
    const searchParams = new URLSearchParams();
    searchParams.set("base", baseCurrency);
    searchParams.set("symbols", currencies.join(","));

    // Frankfurter (ECB reference rates, no API key): business days only, unknown currencies are silently left out
    const finalURL = `https://api.frankfurter.dev/v1/${window.start}..${window.end}?${searchParams.toString()}`;
    console.log("Fetching from " + finalURL);
    const response = await fetch(finalURL);

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates (${response.status}): ${await response.text()}`);
    }

    const body = (await response.json()) as { rates: Record<string, Record<string, number>> };
    // Rates keyed as `${base}${quote}` (e.g. USDEUR = EUR per 1 USD), the format `convertToCurrency` reads
    return Object.fromEntries(
      Object.entries(body.rates).map(([date, rates]) => [
        date,
        Object.fromEntries(Object.entries(rates).map(([currency, rate]) => [`${baseCurrency}${currency}`, rate])),
      ]),
    );
  }
}

function mergeExchangeRates(target: ExchangeRates, source: ExchangeRates): void {
  for (const [date, rates] of Object.entries(source)) {
    target[date] = { ...target[date], ...rates };
  }
}

function pickCurrencyPair(exchangeRates: ExchangeRates, pair: string): ExchangeRates {
  return Object.fromEntries(
    Object.entries(exchangeRates)
      .filter(([, rates]) => rates[pair] !== undefined)
      .map(([date, rates]) => [date, { [pair]: rates[pair] }]),
  );
}
