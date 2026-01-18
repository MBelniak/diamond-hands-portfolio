import React from "react";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";

export const TimePeriodZoom: React.FC<{
  selectedPeriod: TimePeriod;
  handlePeriodChange: (p: TimePeriod) => void;
}> = ({ selectedPeriod, handlePeriodChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.values(TimePeriod).map((period) => (
        <button
          key={period}
          onClick={() => handlePeriodChange(period)}
          className={`px-2 py-[0.1rem] rounded-lg font-medium transition cursor-pointer
                ${
                  selectedPeriod === period
                    ? "bg-slate-800 text-white"
                    : "bg-gray-600/60 text-gray-300  hover:bg-gray-700"
                }`}
          type="button"
        >
          {period}
        </button>
      ))}
    </div>
  );
};
