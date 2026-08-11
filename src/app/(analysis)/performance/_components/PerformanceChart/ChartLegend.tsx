import React, { Dispatch, SetStateAction } from "react";

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
    <div className="flex flex-wrap gap-4 justify-center mt-4">
      {chartLines.map((line) => (
        <button
          key={line.key}
          onClick={() => toggleLine(line.key)}
          className={`flex items-center gap-2 px-3 py-1 rounded-md font-medium transition cursor-pointer
              ${enabledLines[line.key] ? "button-selected" : "button-unselected"}
               `}
          style={{ borderColor: line.color }}
          type="button"
        >
          <span
            style={{
              display: "inline-block",
              width: 16,
              height: 4,
              background: line.color,
              borderRadius: 2,
              opacity: enabledLines[line.key] ? 1 : 0.4,
            }}
          />
          {line.label}
        </button>
      ))}
    </div>
  );
}
