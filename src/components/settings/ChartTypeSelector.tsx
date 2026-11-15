"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { ChartCandlestick, ChartSpline } from "lucide-react";
import { useCurrentChartType } from "@/client/hooks/useCurrentChartType";

export const ChartTypeSelector = () => {
  const { chartType, setCurrentChartType } = useCurrentChartType();

  return (
    <div className={"grid grid-cols-2 gap-1 p-2 items-center w-full"}>
      <span className={"whitespace-nowrap"}>Chart type:</span>
      <div className={"justify-self-center flex gap-4"}>
        <button
          type="button"
          aria-label="Line chart"
          aria-pressed={chartType === "line"}
          className={cn("chip size-9 justify-center p-0", chartType === "line" && "chip-selected")}
          onClick={() => setCurrentChartType("line")}
        >
          <ChartSpline />
        </button>
        <button
          type="button"
          aria-label="Candlestick chart"
          aria-pressed={chartType === "candle"}
          className={cn("chip size-9 justify-center p-0", chartType === "candle" && "chip-selected")}
          onClick={() => setCurrentChartType("candle")}
        >
          <ChartCandlestick />
        </button>
      </div>
    </div>
  );
};
