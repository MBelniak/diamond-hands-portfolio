"use client";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useMemo, useState } from "react";
import { ASSET_CHART_CONTAINER_ID } from "@/app/(analysis)/assets/[asset]/useAssetChart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { ChartData, getChartData } from "@/app/(analysis)/assets/[asset]/getChartData";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@/lib/store";
import { useAssetChart } from "@/app/(analysis)/assets/[asset]/useAssetChart";
import { Switch } from "@/components/ui/switch";

export default function AssetChartPage({ params }: { params: Promise<{ asset: string }> }) {
  const { asset } = use(params);
  const { theme, chartType } = useStore();
  const assetSymbol = decodeURIComponent(asset);
  const { data: portfolioAnalysis, error, isLoading } = usePortfolioAnalysis();
  const assetFullName = portfolioAnalysis?.stockMarketData[assetSymbol]?.longName ?? assetSymbol;
  const router = useRouter();

  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);

  useEffect(() => {
    if (error) {
      router.push("/");
    }
  }, [error, isLoading, portfolioAnalysis, router]);

  const priceHistory: ChartData[] = useMemo(
    () => (portfolioAnalysis ? getChartData(portfolioAnalysis, assetSymbol) : []),
    [assetSymbol, portfolioAnalysis],
  );

  useAssetChart(priceHistory, theme, chartType, showMarkers);

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
      {priceHistory.length === 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-sm shadow-2xl p-8 w-full text-center">
          <h2 className="text-2xl font-bold drop-shadow-lg mb-2">{assetFullName}</h2>
          <p className="text-sm opacity-80 mb-6">No price history is available for this asset.</p>
        </div>
      )}
      {priceHistory.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-sm shadow-2xl p-8 w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold drop-shadow-lg">{assetFullName}</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={showMarkers} onCheckedChange={setShowMarkers} />
              Show operations
            </label>
          </div>
          <div id={ASSET_CHART_CONTAINER_ID} className={"w-full px-[1.5rem] h-[60svh]"} />
        </div>
      )}
    </div>
  );
}
