export enum BenchmarkIndex {
  SP_500 = "^GSPC",
  NASDAQ = "^IXIC",
  DOW_JONES = "^DJI",
}

export const BenchmarkIndexToName = {
  [BenchmarkIndex.SP_500]: "S&P 500",
  [BenchmarkIndex.NASDAQ]: "NASDAQ",
  [BenchmarkIndex.DOW_JONES]: "Dow Jones",
};

export const SELECTED_BENCHMARK_STORAGE_KEY = "selectedBenchmark";
