import { ChartLine, ChartLineKey } from "@/app/(analysis)/performance/_components/PerformanceChart/hooks/useChartLines";
import React, { Dispatch, SetStateAction } from "react";

export const ChartLegend: React.FC<{
  chartLines: ChartLine[];
  enabledLines: Record<ChartLineKey, boolean>;
  handleLinesChange: Dispatch<SetStateAction<Record<ChartLineKey, boolean>>>;
}> = ({ chartLines, enabledLines, handleLinesChange }) => {
  const toggleLine = (key: ChartLineKey) => {
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
};
