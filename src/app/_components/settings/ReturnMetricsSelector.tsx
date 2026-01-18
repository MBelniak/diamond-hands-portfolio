"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import { useStore } from "@/lib/store";
import { ReturnMetric } from "@/lib/returnMetrics";

export const ReturnMetricsSelector: React.FC = () => {
  const { selectedReturnMetric, setSelectedReturnMetric } = useStore();

  return (
    <div className={"flex gap-1 p-2 items-center justify-between w-full"}>
      <span className={"whitespace-nowrap"}>Return Metric:</span>
      <div className={"flex gap-1"}>
        {["SR", "MWR", "TWR"].map((metric) => (
          <Button
            key={metric}
            variant="link"
            className={clsx(selectedReturnMetric === metric && "font-bold underline")}
            onClick={() => {
              setSelectedReturnMetric(metric as ReturnMetric);
            }}
          >
            {metric}
          </Button>
        ))}
      </div>
    </div>
  );
};
