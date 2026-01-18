import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { useMemo } from "react";

export type ChartLineKey = "portfolioValue" | "realizedProfitOrLoss" | "cash" | "profit" | "benchmarkStockValue";

export type ChartLine = {
  key: ChartLineKey;
  label: string;
  color: string;
};

export const chartKeys: Record<ChartLine["key"], string> = {
  portfolioValue: "Portfolio value",
  realizedProfitOrLoss: "Realized profit/loss",
  cash: "Cash",
  profit: "Profit/Loss",
  benchmarkStockValue: "Benchmark value",
};

export const useChartLines = (selectedBenchmark: BenchmarkIndex): ChartLine[] => {
  return useMemo(
    () => [
      {
        key: "portfolioValue",
        label: chartKeys.portfolioValue,
        color: "#a5b4fc",
      },
      {
        key: "profit",
        label: chartKeys.profit,
        color: "#38bdf8",
      },
      {
        key: "realizedProfitOrLoss",
        label: chartKeys.realizedProfitOrLoss,
        color: "#059669",
      },
      {
        key: "cash",
        label: chartKeys.cash,
        color: "#8884d8aa",
      },
      {
        key: "benchmarkStockValue",
        label: BenchmarkIndexToName[selectedBenchmark],
        color: "#f472b6",
      },
    ],
    [selectedBenchmark],
  );
};
