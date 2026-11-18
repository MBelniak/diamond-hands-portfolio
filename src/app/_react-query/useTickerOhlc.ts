"use client";

import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { QueryKeys } from "@/app/_react-query/queryKeys";
import { fetchTickerOhlc } from "@/client/marketData/fetchMarketData";
import { StockTicker } from "@/lib/types";

/** Daily candles of a single ticker, fetched only when its chart is shown. */
export const useTickerOhlc = (ticker: StockTicker) => {
  const { selectedPortfolio } = useStore();

  return useQuery({
    queryKey: [QueryKeys.TICKER_OHLC_QUERY_KEY, selectedPortfolio, ticker],
    queryFn: ({ signal }) => fetchTickerOhlc(ticker, selectedPortfolio, signal),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
};
