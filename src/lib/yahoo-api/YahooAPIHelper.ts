import { startOfDay } from "date-fns";
import { TickerYahooResponse } from "../types";
import { getStockAPISymbol } from "@/lib/xlsx-parser/utils";

export class YahooAPIHelper {
  static async fetchHistoricalTickerMarketData(
    symbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TickerYahooResponse | null> {
    const searchParams = new URLSearchParams();
    searchParams.set("period1", Math.floor(startOfDay(startDate).getTime() / 1000).toString());
    searchParams.set("period2", Math.floor(startOfDay(endDate).getTime() / 1000).toString());
    searchParams.set("interval", "1d");
    searchParams.set("events", "splits");

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${getStockAPISymbol(symbol)}?${searchParams.toString()}`;
    console.log("Fetching stock data for: ", symbol, " from URL: ", url);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        },
      });
      return await res.json();
    } catch (e) {
      console.warn("Failed to fetch stock data for symbol:", symbol, "Error:", e);
      return null;
    }
  }
}
