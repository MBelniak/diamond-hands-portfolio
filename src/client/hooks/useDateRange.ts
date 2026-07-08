"use client";
import { useCallback, useEffect, useState } from "react";

export const MIN_WINDOW_SIZE = 7;

export const useDateRange = (maxLength: number): [[number, number], (values: [number, number]) => void] => {
  const [range, setRange] = useState<[number, number]>([0, 1]);

  useEffect(() => {
    setRange([0, maxLength]);
  }, [maxLength]);

  const handleRangeChange = useCallback(
    (values: [number, number]) => {
      let [start, end] = values;
      if (end - start < MIN_WINDOW_SIZE - 1) {
        if (start === range[0]) {
          end = start + MIN_WINDOW_SIZE - 1;
        } else {
          start = end - MIN_WINDOW_SIZE + 1;
        }
      }
      start = Math.max(0, Math.min(start, maxLength - MIN_WINDOW_SIZE));
      end = Math.max(start + MIN_WINDOW_SIZE - 1, Math.min(end, maxLength));
      setRange([start, end]);
    },
    [maxLength, range],
  );

  return [range, handleRangeChange];
};
