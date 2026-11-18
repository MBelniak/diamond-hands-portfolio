import { AssetsHistoricalData, TickerOhlcData, TickerQuote } from "@/lib/types";
import { addYears } from "date-fns";
import { formatDate } from "@/lib/utils";

export type ChartData = {
  tickerQuote: TickerQuote;
  date: string;
  openMarker?: number | null;
  closeMarker?: number | null;
  volumeMarker?: number | null;
};

/**
 * Candles of the last 3 years with the user's buy/sell operations attached. `assetData` is missing for assets the
 * user never traded (e.g. benchmark indices) - the chart then has no markers.
 */
export const getChartData = (
  ohlc: TickerOhlcData,
  assetData: AssetsHistoricalData[string] | undefined,
): ChartData[] => {
  const fromDate = formatDate(addYears(new Date(), -3));

  return ohlc.dates.flatMap((dateStr, index) => {
    if (dateStr < fromDate) {
      return [];
    }

    const tickerQuote: TickerQuote = {
      open: ohlc.open[index] ?? undefined,
      high: ohlc.high[index] ?? undefined,
      low: ohlc.low[index] ?? undefined,
      close: ohlc.close[index] ?? undefined,
    };

    const openEvent = assetData?.openEvents.find((e) => e.date === dateStr);
    const openPosition = openEvent ? undefined : assetData?.openPositions.find((e) => e.date === dateStr);
    const openMarker = (openEvent ?? openPosition)?.stockPriceOnBuy;
    let volumeMarker = (openEvent ?? openPosition)?.volume;

    const closeEvent = assetData?.closeEvents.find((e) => e.date === dateStr);
    const closeMarker = closeEvent?.stockPriceOnSell;
    if (closeMarker) {
      volumeMarker = closeEvent!.volume + (volumeMarker ?? 0);
    }

    return [{ tickerQuote, date: dateStr, openMarker, closeMarker, volumeMarker }];
  });
};
