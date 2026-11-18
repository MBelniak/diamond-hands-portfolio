import { getSplitFactor } from "@/lib/splits";
import { describe, expect, it } from "vitest";

// SMCI.US 10:1 split, effective 2024-10-01
const smciSplits = [{ effective_date: "2024-10-01", split_factor: 10 }];

describe("getSplitFactor", () => {
  it("applies a split to events before its effective date", () => {
    expect(getSplitFactor(smciSplits, "2024-06-13T11:30:03.000Z")).toBe(10);
  });

  it("applies a split to events on the day before it takes effect (XTB closes positions then)", () => {
    expect(getSplitFactor(smciSplits, "2024-09-30T19:50:32.000Z")).toBe(10);
  });

  it("does not apply a split to events after it", () => {
    expect(getSplitFactor(smciSplits, "2024-10-02T13:47:33.000Z")).toBe(1);
  });

  it("multiplies consecutive splits", () => {
    const splits = [
      { effective_date: "2021-01-01", split_factor: 2 },
      { effective_date: "2024-10-01", split_factor: 10 },
    ];
    expect(getSplitFactor(splits, "2020-06-01T00:00:00.000Z")).toBe(20);
    expect(getSplitFactor(splits, "2022-06-01T00:00:00.000Z")).toBe(10);
  });

  it("returns 1 without splits", () => {
    expect(getSplitFactor(undefined, "2024-06-13T11:30:03.000Z")).toBe(1);
    expect(getSplitFactor([], "2024-06-13T11:30:03.000Z")).toBe(1);
  });
});

describe("getSplitFactor with the exact split time", () => {
  const splits = [{ effective_date: "2024-10-01", effective_time: "2024-10-01T13:30:00.000Z", split_factor: 10 }];

  it("applies the split to events earlier on the effective day", () => {
    expect(getSplitFactor(splits, "2024-10-01T07:20:00.000Z")).toBe(10);
  });

  it("does not apply the split to events later on the effective day", () => {
    expect(getSplitFactor(splits, "2024-10-01T19:03:00.000Z")).toBe(1);
    expect(getSplitFactor(splits, "2024-10-01T13:30:00.000Z")).toBe(1);
  });
});
