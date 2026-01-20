import { PortfolioAnalysis, TickerQuote } from "@/lib/types";
import { getDateRange } from "@/lib/xlsx-parser/utils";
import { addYears } from "date-fns";
import { formatDate } from "@/lib/utils";

export type ChartData = {
  tickerQuote: TickerQuote;
  date: string;
  openMarker?: number | null;
  closeMarker?: number | null;
  volumeMarker?: number | null;
};

export const getChartData = (portfolioAnalysis: PortfolioAnalysis, asset: string): ChartData[] => {
  const assetData = portfolioAnalysis.assetsAnalysis[asset];

  return getDateRange(addYears(new Date(), -3), new Date())
    .map((date) => {
      const dateStr = formatDate(date);

      if (
        !Object.keys(portfolioAnalysis.stockMarketData[asset].splitAdjustedTickerQuoteByDateString).includes(dateStr)
      ) {
        return null;
      }

      const tickerQuote = portfolioAnalysis.stockMarketData[asset].splitAdjustedTickerQuoteByDateString[dateStr] || {};

      const openEvent = assetData.openEvents.find((e) => e.date === dateStr);
      let openMarker;
      let volumeMarker;

      if (openEvent) {
        openMarker = openEvent ? openEvent.stockPriceOnBuy : undefined;
        volumeMarker = openEvent ? openEvent.volume : undefined;
      } else {
        const openPosition = assetData.openPositions.find((e) => e.date === dateStr);
        openMarker = openPosition ? openPosition.stockPriceOnBuy : undefined;
        volumeMarker = openPosition ? openPosition.volume : undefined;
      }

      const closeEvent = assetData.closeEvents.find((e) => e.date === dateStr);
      const closeMarker = closeEvent ? closeEvent.stockPriceOnSell : undefined;
      if (closeMarker) {
        volumeMarker = closeEvent!.volume + (volumeMarker ?? 0);
      }
      return { tickerQuote, date: dateStr, openMarker, closeMarker, volumeMarker };
    })
    .filter((data) => data != null);
};
