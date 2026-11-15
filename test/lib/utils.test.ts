import { getFilteredTimeline, sumLotValue } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("getFilteredTimeline", () => {
  const items = [10, 20, 30, 40, 50];

  it("slices inclusive of both ends", () => {
    expect(getFilteredTimeline(items, [1, 3])).toEqual([20, 30, 40]);
  });

  it("returns entire array for [0, length-1]", () => {
    expect(getFilteredTimeline(items, [0, 4])).toEqual(items);
  });

  it("returns single element", () => {
    expect(getFilteredTimeline(items, [2, 2])).toEqual([30]);
  });
});

describe("sumLotValue", () => {
  it("sums volume × lotSize × price", () => {
    const events = [{ volume: 2 }, { volume: 3 }];
    expect(sumLotValue(events, 10, () => 5)).toBe(250);
  });

  it("returns 0 for empty array", () => {
    expect(sumLotValue([], 10, () => 5)).toBe(0);
  });

  it("uses the getPrice callback per event", () => {
    const events = [
      { volume: 1, price: 10 },
      { volume: 2, price: 20 },
    ];
    expect(sumLotValue(events, 1, (e) => e.price)).toBe(50);
  });
});
