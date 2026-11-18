"use client";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useMemo, useState } from "react";
import { ASSET_CHART_CONTAINER_ID } from "@/app/(analysis)/assets/[asset]/useAssetChart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { useTickerOhlc } from "@/app/_react-query/useTickerOhlc";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { ChartData, getChartData } from "@/app/(analysis)/assets/[asset]/getChartData";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@/lib/store";
import { useAssetChart } from "@/app/(analysis)/assets/[asset]/useAssetChart";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AssetChartPage({ params }: { params: Promise<{ asset: string }> }) {
  const { asset } = use(params);
  const { theme, chartType } = useStore();
  const assetSymbol = decodeURIComponent(asset);
  const { data: portfolioAnalysis, error, isLoading: isAnalysisLoading } = usePortfolioAnalysis();
  const { data: ohlc, isLoading: isOhlcLoading } = useTickerOhlc(assetSymbol);
  const isLoading = isAnalysisLoading || isOhlcLoading;
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
    () => (ohlc ? getChartData(ohlc, portfolioAnalysis?.assetsAnalysis[assetSymbol]) : []),
    [assetSymbol, ohlc, portfolioAnalysis],
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
        <Card>
          <CardHeader title={assetFullName} />
          <CardContent>
            <p className="text-muted-foreground text-sm">No price history is available for this asset.</p>
          </CardContent>
        </Card>
      )}
      {priceHistory.length > 0 && (
        <Card>
          <CardHeader
            title={assetFullName}
            actions={
              <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={showMarkers} onCheckedChange={setShowMarkers} />
                Show operations
              </label>
            }
          />
          <CardContent>
            <div id={ASSET_CHART_CONTAINER_ID} className={"h-[60svh] w-full"} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
