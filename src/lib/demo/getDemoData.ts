import { buildPortfolioEventsResponse, getStockTickersFromEvents } from "@/lib/xlsx-parser/parseXlsx";
import demoPortfolioEvents from "@/lib/demo-data.json";
import { PortfolioCurrency, PortfolioEvents, StockTicker } from "@/lib/types";
import { BenchmarkIndex } from "@/lib/benchmarks";

export async function getDemoPortfolioData(currency: PortfolioCurrency) {
  return await buildPortfolioEventsResponse(demoPortfolioEvents as PortfolioEvents, currency);
}

let demoTickers: Set<StockTicker> | null = null;

/** Tickers the demo portfolio needs market data for: its holdings plus the benchmarks. */
export function getDemoTickers(): Set<StockTicker> {
  if (!demoTickers) {
    const { cashEvents, closedStocksOpenEvents, closedStocksCloseEvents } = demoPortfolioEvents as PortfolioEvents;
    demoTickers = getStockTickersFromEvents([...cashEvents, ...closedStocksOpenEvents, ...closedStocksCloseEvents]);
    Object.values(BenchmarkIndex).forEach((ticker) => demoTickers!.add(ticker));
  }
  return demoTickers;
}
