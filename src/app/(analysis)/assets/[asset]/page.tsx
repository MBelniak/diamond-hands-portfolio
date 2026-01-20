"use client";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { ChartData, getChartData } from "@/app/(analysis)/assets/[asset]/getChartData";
import { Spinner } from "@/components/ui/spinner";
import { CandlestickSeries, createChart, LineSeries } from "lightweight-charts";
import { getChartOptions } from "@/app/globals";
import { useStore } from "@/lib/store";

export default function AssetChartPage({ params }: { params: Promise<{ asset: string }> }) {
  const { asset } = use(params);
  const { theme, chartType } = useStore();
  const assetSymbol = decodeURIComponent(asset);
  const { data: portfolioAnalysis, error, isLoading } = usePortfolioAnalysis();
  const assetFullName = portfolioAnalysis?.stockMarketData[assetSymbol]?.longName ?? assetSymbol;
  const router = useRouter();

  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  useEffect(() => {
    if (error || (!isLoading && !portfolioAnalysis)) {
      router.push("/");
    }
  }, [error, isLoading, portfolioAnalysis, router]);

  const priceHistory: ChartData[] = useMemo(
    () => (portfolioAnalysis ? getChartData(portfolioAnalysis, assetSymbol) : []),
    [assetSymbol, portfolioAnalysis],
  );

  console.dir(priceHistory);

  useEffect(() => {
    const assetChartContainer = document.getElementById("asset-chart");
    if (!assetChartContainer) return;
    const chart = createChart(assetChartContainer, getChartOptions(theme));

    if (chartType === "line") {
      const lineSeries = chart.addSeries(LineSeries, {
        lineWidth: 1,
      });
      lineSeries.setData(priceHistory.map((data) => ({ time: data.date, value: data.tickerQuote.close })));
    } else {
      const candleSeries = chart.addSeries(CandlestickSeries);
      candleSeries.setData(
        priceHistory.map((data) => ({
          time: data.date,
          ...data.tickerQuote,
        })),
      );
    }

    return () => {
      chart.remove();
    };
  }, [chartType, priceHistory, theme]);

  if (isLoading || error || (!isLoading && !portfolioAnalysis)) {
    return (
      <>
        <DiamondLoader />
        <p>Loading your data...</p>
      </>
    );
  }

  return (
    <div className={"flex flex-col w-full items-center gap-8 mb-16 mt-8"}>
      <div className={"w-full flex"}>
        <Button onClick={() => router.push("/assets")} variant="ghost">
          <Link
            href="/assets"
            className="text-md hover:underline inline-block py-6"
            onClick={() => {
              setIsNavigatingBack(true);
            }}
            aria-disabled={isNavigatingBack}
          >
            &larr; Back to Assets Overview {isNavigatingBack ? <Spinner className={"inline"} /> : ""}
          </Link>
        </Button>
      </div>
      <div className="bg-white/10 backdrop-blur-lg rounded-sm shadow-2xl p-8 w-full">
        <h2 className="text-2xl font-bold  mb-6 text-center drop-shadow-lg">{assetFullName}</h2>
        <div id={"asset-chart"} className={"w-full px-[1.5rem] h-[60svh]"} />
      </div>
    </div>
  );
}
