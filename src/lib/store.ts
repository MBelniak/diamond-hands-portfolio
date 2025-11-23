"use client";
import { create } from "zustand";
import { ReturnMetric } from "@/lib/returnMetrics";
import { BenchmarkIndex, SELECTED_BENCHMARK_STORAGE_KEY } from "@/lib/benchmarks";
import { getCurrentTheme, LocalTheme } from "@/hooks/useCurrentTheme";

interface Store {
  selectedReturnMetric: ReturnMetric;
  setSelectedReturnMetric: (data: ReturnMetric) => void;
  useWithdrawnCash: boolean;
  setUseWithdrawnCash: (data: boolean) => void;
  selectedBenchmark: BenchmarkIndex;
  setSelectedBenchmark: (data: BenchmarkIndex) => void;
  theme: LocalTheme;
  setTheme: (data: LocalTheme) => void;
}

const isBrowser = typeof window !== "undefined";

export const useStore = create<Store>((set) => ({
  selectedReturnMetric: "SR",
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
  theme: getCurrentTheme(),
  setTheme: (newTheme: LocalTheme) => {
    set({ theme: newTheme });
  },
}));
