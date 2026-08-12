"use client";
import { useCallback, useEffect, useState } from "react";

export const MIN_WINDOW_SIZE = 7;

export const useDateRange = (maxLength: number): [[number, number], (values: [number, number]) => void] => {
  const [range, setRange] = useState<[number, number]>([0, Math.max(0, maxLength)]);

  useEffect(() => {
    setRange((currentRange) => {
      const nextMax = Math.max(0, maxLength);
      const [currentStart, currentEnd] = currentRange;
      const safeStart = Math.max(0, Math.min(currentStart, nextMax));
      const safeEnd = Math.max(safeStart, Math.min(currentEnd, nextMax));

      return [safeStart, safeEnd];
    });
  }, [maxLength]);

  const handleRangeChange = useCallback(
    (values: [number, number]) => {
      setRange((currentRange) => {
        let [start, end] = values;

        if (end - start < MIN_WINDOW_SIZE - 1) {
          if (start === currentRange[0]) {
            end = start + MIN_WINDOW_SIZE - 1;
          } else {
            start = end - MIN_WINDOW_SIZE + 1;
          }
        }

        const clampMax = Math.max(0, maxLength);
        start = Math.max(0, Math.min(start, clampMax));
        end = Math.max(start + MIN_WINDOW_SIZE - 1, Math.min(end, clampMax));

        return [start, end];
      });
    },
    [maxLength],
  );

  return [range, handleRangeChange];
};
