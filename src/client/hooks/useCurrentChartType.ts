"use client";
import { ChartType, useStore } from "@/lib/store";
import { useCallback } from "react";

export const getCurrentChartType = (): ChartType => {
  const isBrowser = typeof window !== "undefined";

  if (!isBrowser) return "line";

  return (localStorage.getItem("chartType") as ChartType) || "line";
};

export const useCurrentChartType = () => {
  const isBrowser = typeof window !== "undefined";
  const { chartType, setChartType } = useStore();

  const setCurrentChartType = useCallback((newChartType: ChartType) => {
    if (!isBrowser) return;

    setChartType(newChartType);
    localStorage.setItem("chartType", newChartType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { chartType, setCurrentChartType };
};
