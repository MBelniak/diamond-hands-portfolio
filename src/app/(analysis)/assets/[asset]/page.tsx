"use client";
import { redirect } from "next/navigation";
import { Bar, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { getDateRange } from "@/lib/xlsx-parser/utils";
import { addYears } from "date-fns";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { PortfolioAnalysis } from "@/lib/xlsx-parser/types";
import { DiamondLoader } from "@/components/ui/DiamondLoader";

const chartKeys = {
  stockPrice: "Price",
};

type ChartData = {
  price: number | undefined;
  date: string;
  openMarker?: number | null;
  closeMarker?: number | null;
};

const getChartData = (portfolioAnalysis: PortfolioAnalysis, asset: string) => {
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
      openMarker = openEvent ? openEvent.stockValueOnBuy / openEvent.volume : undefined;
      volumeMarker = openEvent ? openEvent.volume : undefined;
    } else {
      const openPosition = assetData.openPositions.find((e) => e.date === dateStr);
      openMarker = openPosition ? openPosition.stockValueOnBuy / openPosition.volume : undefined;
      volumeMarker = openPosition ? openPosition.volume : undefined;
    }

    const closeEvent = assetData.closeEvents.find((e) => e.date === dateStr);
    const closeMarker = closeEvent ? closeEvent.stockValueOnSell / closeEvent.volume : undefined;
    if (closeMarker) {
      volumeMarker = closeEvent!.volume + (volumeMarker ?? 0);
    }
    return { price, date: dateStr, openMarker, closeMarker, volumeMarker };
  });
};

export default function AssetChartPage({ params }: { params: Promise<{ asset: string }> }) {
  const { asset } = use(params);
  const { data: portfolioAnalysis, error, isLoading } = usePortfolioAnalysis();
  const [range, setRange] = useState<[number, number]>([0, 1]);

  useEffect(() => {
    if (portfolioAnalysis) {
      setRange([0, getChartData(portfolioAnalysis, asset).length - 1]);
    }
  }, [asset, portfolioAnalysis]);

  if (error || (!isLoading && !portfolioAnalysis)) {
    redirect("/");
  }

  if (isLoading) {
    return (
      <>
        <DiamondLoader />
        <p>Loading your data...</p>
      </>
    );
  }

  const priceHistory: ChartData[] = getChartData(portfolioAnalysis!, asset);

  const minWindowSize = 7;

  const windowStart = Math.max(0, Math.min(range[0], priceHistory.length - minWindowSize));
  const windowEnd = Math.max(windowStart + minWindowSize - 1, Math.min(range[1], priceHistory.length - 1));
  const windowedData = priceHistory.slice(windowStart, windowEnd + 1);

  const handleRangeChange = (values: [number, number]) => {
    let [start, end] = values;
    if (end - start < minWindowSize - 1) {
      if (start === range[0]) {
        end = start + minWindowSize - 1;
      } else {
        start = end - minWindowSize + 1;
      }
    }
    start = Math.max(0, Math.min(start, priceHistory.length - minWindowSize));
    end = Math.max(start + minWindowSize - 1, Math.min(end, priceHistory.length - 1));
    setRange([start, end]);
  };

  return (
    <div className={"flex flex-col w-full items-center gap-8 mb-16 mt-8"}>
      <div className={"w-full max-w-3xl flex"}>
        <Button onClick={() => redirect("/assets")} variant="ghost">
          <Link href="/assets" className="text-md hover:underline inline-block py-6">
            &larr; Back to Assets Overview
          </Link>
        </Button>
      </div>
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-3xl">
        <h2 className="text-2xl font-bold  mb-6 text-center drop-shadow-lg">{asset}</h2>
        <div style={{ width: "100%", padding: "0 24px", boxSizing: "border-box", height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={windowedData}>
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--foreground)" }}
                domain={[
                  (dataMin: number) => Math.floor(dataMin - 0.03 * dataMin),
                  (dataMax: number) => Math.ceil(dataMax + 0.03 * dataMax),
                ]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: "var(--foreground)" }}
                domain={[
                  (dataMin: number) => Math.floor(dataMin - 0.03 * dataMin),
                  (dataMax: number) => Math.ceil(dataMax + 0.03 * dataMax),
                ]}
              />
              <Tooltip
                formatter={(value: number) => value?.toFixed(2)}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  background: "var(--tooltip-background)",
                  borderRadius: "0.75rem",
                  color: "var(--foreground)",
                  border: "1px solid #a5b4fc",
                }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="price"
                stroke="#85a4dc"
                strokeWidth={2}
                dot={false}
                name={chartKeys.stockPrice}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="openMarker"
                stroke="#22c55e"
                strokeWidth={0}
                dot={{ stroke: "#22c55e", strokeWidth: 2, r: 5 }}
                name="Open"
                legendType="circle"
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="closeMarker"
                stroke="#ef4444"
                strokeWidth={0}
                dot={{ stroke: "#ef4444", strokeWidth: 2, r: 5 }}
                name="Close"
                legendType="circle"
              />
              <Bar yAxisId="right" dataKey="volumeMarker" fill="#38bdf8" name="Volume" barSize={12} opacity={0.7} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={"w-full mt-4 flex flex-col gap-8 px-8"}>
          <label className=" font-semibold">
            Date range: {priceHistory[windowStart].date} - {priceHistory[windowEnd].date}
          </label>
          <DualRangeSlider
            min={0}
            max={priceHistory.length - 1}
            value={[windowStart, windowEnd]}
            step={1}
            minStepsBetweenThumbs={minWindowSize - 1}
            onValueChange={handleRangeChange}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
