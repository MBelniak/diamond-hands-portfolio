"use client";
import { redirect } from "next/navigation";
import { useStore } from "@/lib/store";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const chartKeys = {
  stockPrice: "Price",
};

type ChartData = {
  price: number | undefined;
  date: string;
  openMarker?: number | null;
  closeMarker?: number | null;
};

export default function AssetChartPage({ params }: { params: Promise<{ asset: string }> }) {
  const { portfolioAnalysis } = useStore();
  const { asset } = use(params);

  if (!portfolioAnalysis) {
    redirect("/");
  }

  const assetData = portfolioAnalysis.assetsAnalysis[asset as string];

  const priceHistory: ChartData[] = portfolioAnalysis.portfolioTimeline
    .filter((data) => data.stocks[asset] != null)
    .map((data) => {
      const date = data.date.slice(0, 10);
      const price = data.stocks[asset].price;
      const openEvent = assetData.openEvents.find((e) => e.date === date);
      let openMarker;

      if (openEvent) {
        openMarker = openEvent ? openEvent.stockValueOnBuy / openEvent.volume : undefined;
      } else {
        const openPosition = assetData.openPositions.find((e) => e.date === date);
        openMarker = openPosition ? openPosition.stockValueOnBuy / openPosition.volume : undefined;
      }

      const closeEvent = assetData.closeEvents.find((e) => e.date === date);
      const closeMarker = closeEvent ? closeEvent.stockValueOnSell / closeEvent.volume : undefined;
      return { price, date, openMarker, closeMarker };
    });

  return (
    <div className={"flex flex-col w-full items-center gap-8 mb-16 mt-8"}>
      <div className={"w-full max-w-3xl flex"}>
        <Button onClick={() => redirect("/assets")} variant="ghost">
          <Link href="/assets" className="text-md text-white hover:underline inline-block py-6">
            &larr; Back to Assets Overview
          </Link>
        </Button>
      </div>
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center drop-shadow-lg">{asset}</h2>
        <div style={{ width: "100%", padding: "0 24px", boxSizing: "border-box", height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceHistory}>
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#fff" }} />
              <YAxis
                tick={{ fontSize: 12, fill: "#fff" }}
                domain={[
                  (dataMin: number) => Math.floor(dataMin - 0.03 * dataMin),
                  (dataMax: number) => Math.ceil(dataMax + 0.03 * dataMax),
                ]}
              />
              <Tooltip
                formatter={(value: number) => value?.toFixed(2)}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  background: "rgba(30, 50, 150, 1)",
                  borderRadius: "0.75rem",
                  color: "#fff",
                  border: "1px solid #a5b4fc",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#a5b4fc"
                strokeWidth={2}
                dot={false}
                name={chartKeys.stockPrice}
              />
              <Line
                type="monotone"
                dataKey="openMarker"
                stroke="#22c55e"
                strokeWidth={0}
                dot={{ stroke: "#22c55e", strokeWidth: 2, r: 5 }}
                name="Open"
                legendType="circle"
              />
              <Line
                type="monotone"
                dataKey="closeMarker"
                stroke="#ef4444"
                strokeWidth={0}
                dot={{ stroke: "#ef4444", strokeWidth: 2, r: 5 }}
                name="Close"
                legendType="circle"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
