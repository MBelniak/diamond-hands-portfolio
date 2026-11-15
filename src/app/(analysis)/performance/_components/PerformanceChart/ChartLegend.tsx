import React, { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";

type ChartLegendLine<LineKey extends string> = {
  key: LineKey;
  label: string;
  color: string;
};

type ChartLegendProps<LineKey extends string> = {
  chartLines: Array<ChartLegendLine<LineKey>>;
  enabledLines: Record<LineKey, boolean>;
  handleLinesChange: Dispatch<SetStateAction<Record<LineKey, boolean>>>;
};

export function ChartLegend<LineKey extends string>({
  chartLines,
  enabledLines,
  handleLinesChange,
}: ChartLegendProps<LineKey>) {
  const toggleLine = (key: LineKey) => {
    handleLinesChange((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {chartLines.map((line) => {
        const enabled = enabledLines[line.key];
        return (
          <button
            key={line.key}
            onClick={() => toggleLine(line.key)}
            className={cn("chip", enabled && "chip-selected")}
            // The selected chip is outlined with the series colour
            style={{ "--chip-accent": line.color } as React.CSSProperties}
            aria-pressed={enabled}
            type="button"
          >
            <span
              aria-hidden
              className="inline-block h-0.5 w-3.5 transition-opacity"
              style={{ background: line.color, opacity: enabled ? 1 : 0.35 }}
            />
            {line.label}
          </button>
        );
      })}
    </div>
  );
}
