import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { PortfolioCurrency, StockTicker } from "@/lib/types";
import { getDemoTickers } from "@/lib/demo/getDemoData";
import { DEMO_MODE_COOKIE_KEY } from "@/app/consts";

const TICKER_PATTERN = /^[A-Za-z0-9.^=_-]{1,32}$/;
/** Upper bound for one bulk request - a portfolio plus the benchmarks is far below it. */
export const MAX_TICKERS_PER_REQUEST = 200;

/**
 * Quotes are refreshed hourly on the server. `private`: the endpoints require auth, so shared caches (CDNs) must
 * not serve them to anonymous clients.
 */
export const MARKET_DATA_CACHE_CONTROL = "private, max-age=3600";

/**
 * Access and input checks shared by the `/api/market-data/{portfolioCurrency}/...` routes. Returns an error response,
 * or `null` when the request may proceed. Signed-in users may fetch any ticker; demo mode (anonymous) only the demo
 * portfolio's tickers.
 */
export async function checkMarketDataRequest(currency: string, tickers: StockTicker[]): Promise<Response | null> {
  const demoMode = (await cookies()).get(DEMO_MODE_COOKIE_KEY)?.value === "true";
  if (demoMode) {
    const demoTickers = getDemoTickers();
    if (!tickers.every((ticker) => demoTickers.has(ticker))) {
      return NextResponse.json({ error: "Ticker not available in demo mode." }, { status: 403 });
    }
  } else if (!(await auth()).userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Object.values(PortfolioCurrency).includes(currency as PortfolioCurrency)) {
    return NextResponse.json({ error: `Unsupported currency "${currency}".` }, { status: 400 });
  }
  if (!tickers.every((ticker) => TICKER_PATTERN.test(ticker))) {
    return NextResponse.json({ error: "Invalid ticker." }, { status: 400 });
  }
  return null;
}
