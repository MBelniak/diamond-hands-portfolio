import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import portfolioTimeline from "../../../dist/portfolioTimeline.json";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";

const currency = "$";
const chartKeys = {
  portfolioValue: "Portfolio value",
  profitOrLoss: "Realized profit/loss",
  cash: "Cash",
  sp500Value: "S&P 500",
};

export function PerformanceChart() {
  const data = portfolioTimeline.map((item) => ({ ...item, date: item.date.slice(0, 10) }));

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
    <>
      <h2>Portfolio value over time ({currency})</h2>
      <div style={{ width: "100%", padding: "0 24px", boxSizing: "border-box", height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={windowedData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => value.toFixed(2)}
              labelFormatter={(label) => `Date: ${label}`}
              itemSorter={({ dataKey }) => {
                return { portfolioValue: -1, profitOrLoss: 1, cash: 2 }[dataKey as string] || 3;
              }}
            />
            <Line
              type="monotone"
              dataKey="portfolioValue"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              name={chartKeys.portfolioValue}
            />
            <Line
              type="monotone"
              dataKey="profitOrLoss"
              stroke="#0c4a6e"
              strokeWidth={2}
              dot={false}
              name={chartKeys.profitOrLoss}
            />
            <Line type="monotone" dataKey="cash" stroke="#8884d855" strokeWidth={2} dot={false} name={chartKeys.cash} />
            <Line
              type="monotone"
              dataKey="sp500Value"
              stroke="#00bc4555"
              strokeWidth={2}
              dot={false}
              name={chartKeys.sp500Value}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{ width: "100%", padding: "0 24px", marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}
      >
        <label>
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
    </>
  );
}
