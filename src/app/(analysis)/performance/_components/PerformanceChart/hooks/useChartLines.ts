import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";

export type ChartLineKey =
  | "portfolioValue"
  | "accPortfolioValue"
  | "realizedProfitOrLoss"
  | "cash"
  | "profitOrLoss"
  | "benchmarkData";

export type ChartLine<LineKey extends string = ChartLineKey> = {
  key: LineKey;
  label: string;
  color: string;
};

export const chartKeys: Record<ChartLineKey, string> = {
  portfolioValue: "Portfolio value",
  accPortfolioValue: "Accumulated portfolio value",
  realizedProfitOrLoss: "Realized profit/loss",
  cash: "Cash",
  profitOrLoss: "Profit/Loss",
  benchmarkData: "Benchmark value",
};

export const useChartLines = (selectedBenchmark: BenchmarkIndex, useWithdrawnCash: boolean): ChartLine[] => {
  return [
    ...(useWithdrawnCash
      ? [
          {
            key: "accPortfolioValue",
            label: chartKeys.accPortfolioValue,
            color: "#a5b4fc",
          } as ChartLine,
        ]
      : [
          {
            key: "portfolioValue",
            label: chartKeys.portfolioValue,
            color: "#a5b4fc",
          } as ChartLine,
        ]),
    {
      key: "profitOrLoss",
      label: chartKeys.profitOrLoss,
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
      key: "benchmarkData",
      label: BenchmarkIndexToName[selectedBenchmark],
      color: "#f472b6",
    },
  ];
};
