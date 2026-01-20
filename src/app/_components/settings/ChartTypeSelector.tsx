"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { ChartCandlestick, ChartSpline } from "lucide-react";
import { useCurrentChartType } from "@/hooks/useCurrentChartType";

export const ChartTypeSelector = () => {
  const { chartType, setCurrentChartType } = useCurrentChartType();

  return (
    <div className={"grid grid-cols-2 gap-1 p-2 items-center w-full"}>
      <span className={"whitespace-nowrap"}>Chart type:</span>
      <div className={"justify-self-center flex gap-4"}>
        <Button
          variant="outline"
          size="icon"
          aria-label="Submit"
          className={
            chartType === "line"
              ? "bg-slate-700 text-gray-100 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-accent"
              : "text-muted-foreground"
          }
          onClick={() => setCurrentChartType("line")}
        >
          <ChartSpline />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Submit"
          className={
            chartType === "candle"
              ? "bg-slate-700 text-gray-100 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-accent"
              : "text-muted-foreground"
          }
          onClick={() => setCurrentChartType("candle")}
        >
          <ChartCandlestick />
        </Button>
      </div>
    </div>
  );
};
