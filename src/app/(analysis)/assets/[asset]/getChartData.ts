import { PortfolioAnalysis } from "@/lib/types";
import { getDateRange } from "@/lib/xlsx-parser/utils";
import { addYears } from "date-fns";

export const getChartData = (portfolioAnalysis: PortfolioAnalysis, asset: string) => {
  const assetData = portfolioAnalysis.assetsAnalysis[asset];

  return getDateRange(addYears(new Date(), -3), new Date()).map((date) => {
    const dateStr = date.toISOString().slice(0, 10);

    const dataOnDate = portfolioAnalysis.portfolioTimeline
      .filter((data) => data.stocks[asset] != null)
      .find((data) => data.date.slice(0, 10) === dateStr);

    if (!dataOnDate) {
      return {
        date: dateStr,
        price: portfolioAnalysis.stockPrices[asset as string].splitAdjustedPrice[dateStr],
        openMarker: undefined,
        closeMarker: undefined,
        volumeMarker: undefined,
      };
    }

    const price = dataOnDate.stocks[asset].splitAdjustedPrice;
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
    return { price, date: dateStr, openMarker, closeMarker, volumeMarker };
  });
};
