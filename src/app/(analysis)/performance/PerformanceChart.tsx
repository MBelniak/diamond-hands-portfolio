"use client";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { useStore } from "@/lib/store";
import { redirect } from "next/navigation";

const currency = "$";
const chartKeys = {
  portfolioValue: "Portfolio value",
  profitOrLoss: "Realized profit/loss",
  cash: "Cash",
  sp500Value: "S&P 500",
};

export function PerformanceChart() {
  const { portfolioAnalysis } = useStore();

  if (!portfolioAnalysis) {
    redirect("/");
  }

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;

  const data = portfolioTimeline
    .map((item) => ({ ...item, date: item.date.slice(0, 10) }))
    .slice(
      portfolioTimeline.findIndex((record) => Object.entries(record.stocks).length || record.cash),
      -1,
    );

  const minWindowSize = 7;
  const [range, setRange] = useState<[number, number]>([0, data.length - 1]);

  const windowStart = Math.max(0, Math.min(range[0], data.length - minWindowSize));
  const windowEnd = Math.max(windowStart + minWindowSize - 1, Math.min(range[1], data.length - 1));
  const windowedData = data.slice(windowStart, windowEnd + 1);

  const handleRangeChange = (values: [number, number]) => {
    let [start, end] = values;
    if (end - start < minWindowSize - 1) {
      if (start === range[0]) {
        end = start + minWindowSize - 1;
      } else {
        start = end - minWindowSize + 1;
      }
    }

    start = Math.max(0, Math.min(start, data.length - minWindowSize));
    end = Math.max(start + minWindowSize - 1, Math.min(end, data.length - 1));
    setRange([start, end]);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl w-full p-6">
      <h2 className="text-2xl font-bold text-white mb-6 text-center drop-shadow-lg">
        Portfolio value over time ({currency})
      </h2>
      <div style={{ width: "100%", padding: "0 24px", boxSizing: "border-box", height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/*@ts-ignore*/}
          <LineChart data={windowedData}>
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#fff" }} />
            <YAxis tick={{ fontSize: 12, fill: "#fff" }} />
            <Tooltip
              formatter={(value: number) => value.toFixed(2)}
              labelFormatter={(label) => `Date: ${label}`}
              itemSorter={({ dataKey }) => {
                return { portfolioValue: -1, profitOrLoss: 1, cash: 2 }[dataKey as string] || 3;
              }}
              contentStyle={{
                background: "rgba(30, 50, 150, 1)",
                borderRadius: "0.75rem",
                color: "#fff",
                border: "1px solid #a5b4fc",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="portfolioValue"
              stroke="#a5b4fc"
              strokeWidth={2}
              dot={false}
              name={chartKeys.portfolioValue}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="profitOrLoss"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              name={chartKeys.profitOrLoss}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="cash"
              stroke="#8884d8aa"
              strokeWidth={2}
              dot={false}
              name={chartKeys.cash}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="sp500Value"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              name={chartKeys.sp500Value}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className={"w-full mt-4 flex flex-col gap-8 px-8"}>
        <label className="text-white font-semibold">
          Date range: {data[windowStart].date} - {data[windowEnd].date}
        </label>
        <DualRangeSlider
          min={0}
          max={data.length - 1}
          value={[windowStart, windowEnd]}
          step={1}
          minStepsBetweenThumbs={minWindowSize - 1}
          onValueChange={handleRangeChange}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
