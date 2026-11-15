import React from "react";
import { cn } from "@/lib/utils";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";

export const TimePeriodZoom: React.FC<{
  selectedPeriod: TimePeriod;
  handlePeriodChange: (p: TimePeriod) => void;
}> = ({ selectedPeriod, handlePeriodChange }) => {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Time period">
      {Object.values(TimePeriod).map((period) => (
        <button
          key={period}
          onClick={() => handlePeriodChange(period)}
          className={cn("chip px-2.5", selectedPeriod === period && "chip-selected")}
          aria-pressed={selectedPeriod === period}
          type="button"
        >
          {period}
        </button>
      ))}
    </div>
  );
};
