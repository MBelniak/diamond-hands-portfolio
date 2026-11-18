import { NextResponse } from "next/server";
import {
  checkMarketDataRequest,
  MARKET_DATA_CACHE_CONTROL,
  MAX_TICKERS_PER_REQUEST,
} from "@/lib/market-data/marketDataRoute";
import { getStockMarketData } from "@/lib/market-data/marketData";
import { toCompactTickerMarketData } from "@/lib/market-data/compactMarketData";
import { CompactTickerMarketData, PortfolioCurrency } from "@/lib/types";

/**
 * Close-only, split-adjusted daily prices of the tickers in the body (`{"tickers": [...]}`), converted to the
 * portfolio currency. Tickers without market data are left out of the response.
 * POST, not QUERY: Next.js route handlers (and CloudFront / API Gateway) don't support the QUERY method.
 */
export async function POST(req: Request, { params }: { params: Promise<{ currency: string }> }) {
  const { currency } = await params;
  const body = await req.json().catch(() => null);
  const tickers: unknown = body?.tickers;

  if (
    !Array.isArray(tickers) ||
    tickers.length > MAX_TICKERS_PER_REQUEST ||
    !tickers.every((ticker) => typeof ticker === "string")
  ) {
    return NextResponse.json(
      { error: `Body must be {"tickers": string[]} with at most ${MAX_TICKERS_PER_REQUEST} tickers.` },
      { status: 400 },
    );
  }

  const errorResponse = await checkMarketDataRequest(currency, tickers);
  if (errorResponse) {
    return errorResponse;
  }

  const portfolioCurrency = currency as PortfolioCurrency;
  const { stockMarketData } = await getStockMarketData(new Set(tickers), portfolioCurrency);
  const response: CompactTickerMarketData[] = Object.entries(stockMarketData).map(([ticker, data]) =>
    toCompactTickerMarketData(ticker, portfolioCurrency, data),
  );

  return NextResponse.json(response, { headers: { "Cache-Control": MARKET_DATA_CACHE_CONTROL } });
}
