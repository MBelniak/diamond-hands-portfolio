import { expandStockMarketData } from "@/lib/market-data/compactMarketData";
import { CompactTickerMarketData, PortfolioCurrency, StockMarketData, StockTicker, TickerOhlcData } from "@/lib/types";

/** `null` when the server has no data for the ticker; throws on any other failure. */
async function fetchMarketDataJson<T>(url: string, init: RequestInit): Promise<T | null> {
  const res = await fetch(url, init);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch market data: ${url} (${res.status})`);
  }
  return (await res.json()) as T;
}

/**
 * Fetches the market data of all tickers in one request and expands it into the shape the portfolio analysis works
 * on. Tickers without market data are left out.
 */
export async function fetchStockMarketData(
  tickers: StockTicker[],
  currency: PortfolioCurrency,
  signal?: AbortSignal,
): Promise<StockMarketData> {
  const compactData = await fetchMarketDataJson<CompactTickerMarketData[]>(`/api/market-data/${currency}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tickers }),
    signal,
  });
  return expandStockMarketData(compactData ?? []);
}

export function fetchTickerOhlc(
  ticker: StockTicker,
  currency: PortfolioCurrency,
  signal?: AbortSignal,
): Promise<TickerOhlcData | null> {
  return fetchMarketDataJson<TickerOhlcData>(`/api/market-data/${currency}/${encodeURIComponent(ticker)}/ohlc`, {
    signal,
  });
}
