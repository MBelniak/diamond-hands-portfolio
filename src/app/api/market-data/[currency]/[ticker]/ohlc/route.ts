import { NextResponse } from "next/server";
import { checkMarketDataRequest, MARKET_DATA_CACHE_CONTROL } from "@/lib/market-data/marketDataRoute";
import { getTickerMarketData } from "@/lib/market-data/marketData";
import { toTickerOhlcData } from "@/lib/market-data/compactMarketData";
import { PortfolioCurrency } from "@/lib/types";

/** Split-adjusted daily candles of a ticker in the portfolio currency, for the asset chart. */
export async function GET(_req: Request, { params }: { params: Promise<{ currency: string; ticker: string }> }) {
  const { currency, ticker: encodedTicker } = await params;
  const ticker = decodeURIComponent(encodedTicker);

  const errorResponse = await checkMarketDataRequest(currency, [ticker]);
  if (errorResponse) {
    return errorResponse;
  }

  const portfolioCurrency = currency as PortfolioCurrency;
  const tickerMarketData = await getTickerMarketData(ticker, portfolioCurrency);
  if (!tickerMarketData) {
    return NextResponse.json({ error: `No market data for "${ticker}".` }, { status: 404 });
  }

  return NextResponse.json(toTickerOhlcData(ticker, portfolioCurrency, tickerMarketData), {
    headers: { "Cache-Control": MARKET_DATA_CACHE_CONTROL },
  });
}
