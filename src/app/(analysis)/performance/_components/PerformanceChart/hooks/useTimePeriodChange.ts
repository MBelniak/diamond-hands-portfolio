import { useCallback, useState } from "react";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";

export const useTimePeriodChange = <TTimeline extends { date: string }>(
  validTimeline: TTimeline[],
  handleRangeChange: (range: [number, number]) => void,
): [TimePeriod, (period: TimePeriod) => void] => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(TimePeriod.All);

  // Calculate the range based on time period
  const getDateRangeByPeriod = useCallback(
    (period: string): [number, number] => {
      const endIndex = validTimeline.length - 1;

      if (period === TimePeriod.All) {
        return [0, endIndex];
      }

      // Get the end date from the last timeline entry
      const endDateStr = validTimeline[endIndex].date;
      const endDate = new Date(endDateStr);

      const startDate = new Date(endDate);
      if (period === TimePeriod.OneMonth) {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === TimePeriod.ThreeMonths) {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (period === TimePeriod.SixMonths) {
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (period === TimePeriod.OneYear) {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (period === TimePeriod.YearToDate) {
        startDate.setMonth(0);
        startDate.setDate(0);
      } else if (period === TimePeriod.TwoYears) {
        startDate.setFullYear(startDate.getFullYear() - 2);
      } else if (period === TimePeriod.FiveYears) {
        startDate.setFullYear(startDate.getFullYear() - 5);
      }

      const startDateStr = startDate.toISOString().slice(0, 10);

      // Find the index where the date is closest to or after the calculated start date
      let startIndex = 0;
      for (let i = 0; i < validTimeline.length; i++) {
        if (validTimeline[i].date >= startDateStr) {
          startIndex = i;
          break;
        }
        startIndex = i;
      }

      return [startIndex, endIndex];
    },
    [validTimeline],
  );

  return [
    selectedPeriod,
    useCallback(
      (period: TimePeriod) => {
        setSelectedPeriod(period);
        const [start, end] = getDateRangeByPeriod(period);
        handleRangeChange([start, end]);
      },
      [getDateRangeByPeriod, handleRangeChange],
    ),
  ];
};
