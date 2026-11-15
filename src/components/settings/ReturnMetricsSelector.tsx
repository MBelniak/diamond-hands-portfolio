"use client";
import React from "react";
import { clsx } from "clsx";
import { useStore } from "@/lib/store";
import { ReturnMetric } from "@/lib/returnMetrics";

export const ReturnMetricsSelector: React.FC = () => {
  const { selectedReturnMetric, setSelectedReturnMetric } = useStore();

  return (
    <div className={"grid grid-cols-2  gap-1 p-2 items-center w-full"}>
      <span className={"whitespace-nowrap"}>Return Metric:</span>
      <div className={"flex gap-1.5"} role="group" aria-label="Return metric">
        {["SR", "MWR", "TWR"].map((metric) => (
          <button
            key={metric}
            type="button"
            aria-pressed={selectedReturnMetric === metric}
            className={clsx("chip", selectedReturnMetric === metric && "chip-selected")}
            onClick={() => {
              setSelectedReturnMetric(metric as ReturnMetric);
            }}
          >
            {metric}
          </button>
        ))}
      </div>
    </div>
  );
};
