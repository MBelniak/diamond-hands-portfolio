import { useEffect } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  LineSeries,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import { getChartOptions } from "@/app/globals";
import { ChartData } from "@/app/(analysis)/assets/[asset]/getChartData";
import { LocalTheme } from "@/client/hooks/useCurrentTheme";

export const ASSET_CHART_CONTAINER_ID = "asset-chart-container";

function buildMarkers(priceHistory: ChartData[]): SeriesMarker<Time>[] {
  const markers: SeriesMarker<Time>[] = [];

  for (const data of priceHistory) {
    if (data.openMarker != null) {
      markers.push({
        time: data.date as Time,
        position: "belowBar",
        color: "#22c55e",
        shape: "circle",
        text: `Buy ${data.volumeMarker?.toFixed(2)} @ ${data.openMarker?.toFixed(2)}`,
      });
    }
    if (data.closeMarker != null) {
      markers.push({
        time: data.date as Time,
        position: "aboveBar",
        color: "#ef4444",
        shape: "circle",
        text: `Sell ${data.volumeMarker?.toFixed(2)} @ ${data.closeMarker?.toFixed(2)}`,
      });
    }
  }

  return markers.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

export function useAssetChart(priceHistory: ChartData[], theme: LocalTheme, chartType: string, showMarkers: boolean) {
  useEffect(() => {
    const assetChartContainer = document.getElementById(ASSET_CHART_CONTAINER_ID);
    if (!assetChartContainer) return;
    if (priceHistory.length === 0) return;

    const chart = createChart(assetChartContainer, getChartOptions(theme));
    const markers = showMarkers ? buildMarkers(priceHistory) : [];

    if (chartType === "line") {
      const lineSeries = chart.addSeries(LineSeries, {
        lineWidth: 1,
      });
      lineSeries.setData(priceHistory.map((data) => ({ time: data.date, value: data.tickerQuote.close })));
      createSeriesMarkers(lineSeries, markers);
    } else {
      const candleSeries = chart.addSeries(CandlestickSeries);
      candleSeries.setData(
        priceHistory.map((data) => ({
          time: data.date,
          ...data.tickerQuote,
        })),
      );
      createSeriesMarkers(candleSeries, markers);
    }

    return () => {
      chart.remove();
    };
  }, [chartType, priceHistory, showMarkers, theme]);
}
