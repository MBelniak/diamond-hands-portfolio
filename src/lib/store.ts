"use client";
import { create } from "zustand";
import { ReturnMetric } from "@/lib/returnMetrics";
import { BenchmarkIndex, SELECTED_BENCHMARK_STORAGE_KEY } from "@/lib/benchmarks";
import { getCurrentTheme, LocalTheme } from "@/hooks/useCurrentTheme";
import { PortfolioCurrency } from "@/lib/types";
import { SELECTED_CURRENCY_STORAGE_KEY } from "@/app/consts";
import { getCurrentChartType } from "@/hooks/useCurrentChartType";

export type ChartType = "line" | "candle";

interface Store {
  selectedReturnMetric: ReturnMetric;
  setSelectedReturnMetric: (data: ReturnMetric) => void;
  useWithdrawnCash: boolean;
  setUseWithdrawnCash: (data: boolean) => void;
  selectedBenchmark: BenchmarkIndex;
  setSelectedBenchmark: (data: BenchmarkIndex) => void;
  selectedPortfolio: PortfolioCurrency;
  setSelectedPortfolio: (data: PortfolioCurrency) => void;
  theme: LocalTheme;
  setTheme: (data: LocalTheme) => void;
  chartType: ChartType;
  setChartType: (chartType: ChartType) => void;
}

const isBrowser = typeof window !== "undefined";

export const useStore = create<Store>((set) => ({
  selectedReturnMetric: ReturnMetric.SIMPLE_RETURN,
  setSelectedReturnMetric: (data: ReturnMetric) => {
    set({ selectedReturnMetric: data });
  },
  useWithdrawnCash: false,
  setUseWithdrawnCash: (data: boolean) => {
    set({ useWithdrawnCash: data });
  },
  selectedBenchmark:
    (isBrowser ? (localStorage.getItem(SELECTED_BENCHMARK_STORAGE_KEY) as BenchmarkIndex) : undefined) ??
    BenchmarkIndex.SP_500,
  setSelectedBenchmark: (data: BenchmarkIndex) => {
    localStorage.setItem(SELECTED_BENCHMARK_STORAGE_KEY, data);
    set({ selectedBenchmark: data });
  },
  selectedPortfolio: ((isBrowser && localStorage.getItem(SELECTED_CURRENCY_STORAGE_KEY)) as PortfolioCurrency) || "USD",
  setSelectedPortfolio: (data: PortfolioCurrency) => {
    localStorage.setItem(SELECTED_CURRENCY_STORAGE_KEY, data);
    set({ selectedPortfolio: data });
  },
  theme: getCurrentTheme(),
  setTheme: (newTheme: LocalTheme) => {
    set({ theme: newTheme });
  },
  chartType: getCurrentChartType(),
  setChartType: (chartType: ChartType) => {
    set({ chartType });
  },
}));
