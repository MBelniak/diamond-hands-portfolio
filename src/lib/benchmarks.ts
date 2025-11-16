export enum BenchmarkIndex {
  SP_500 = "^GSPC",
  NASDAQ = "^IXIC",
  DOW_JONES = "^DJI",
  NYSE = "^NYA",
}

export const BenchmarkIndexToName = {
  [BenchmarkIndex.SP_500]: "S&P 500",
  [BenchmarkIndex.NASDAQ]: "NASDAQ",
  [BenchmarkIndex.DOW_JONES]: "Dow Jones",
  [BenchmarkIndex.NYSE]: "NYSE",
} as const;

export const SELECTED_BENCHMARK_STORAGE_KEY = "selectedBenchmark";
