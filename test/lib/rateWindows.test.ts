import { describe, expect, it } from "vitest";
import { getRatesForDate, getRateWindows } from "@/lib/exchange-rates/rateWindows";

describe("getRateWindows", () => {
  const start = new Date(2022, 0, 0); // 2021-12-31, as MARKET_DATA_START_DATE

  it("splits the period into 365-day windows, only the last one still open", () => {
    expect(getRateWindows(start, new Date(2024, 5, 15, 13))).toEqual([
      { start: "2021-12-31", end: "2022-12-31", complete: true },
      { start: "2022-12-31", end: "2023-12-31", complete: true },
      { start: "2023-12-31", end: "2024-06-15", complete: false },
    ]);
  });

  it("keeps past window boundaries stable as time goes on", () => {
    const earlier = getRateWindows(start, new Date(2024, 5, 15));
    const later = getRateWindows(start, new Date(2025, 2, 1));
    expect(later.slice(0, 2)).toEqual(earlier.slice(0, 2));
    expect(later[2]).toEqual({ start: "2023-12-31", end: "2024-12-30", complete: true });
    expect(later[3]).toEqual({ start: "2024-12-30", end: "2025-03-01", complete: false });
  });

  it("treats a window ending today as still open", () => {
    expect(getRateWindows(start, new Date(2022, 11, 31, 18))).toEqual([
      { start: "2021-12-31", end: "2022-12-31", complete: false },
      { start: "2022-12-31", end: "2022-12-31", complete: false },
    ]);
  });
});

describe("getRatesForDate", () => {
  const rates = { "2024-06-10": { USDEUR: 0.92 }, "2024-06-12": { USDEUR: 0.93 } };

  it("returns the day's rates", () => {
    expect(getRatesForDate(rates, "2024-06-12")).toEqual({ USDEUR: 0.93 });
  });

  it("falls back to the closest earlier day", () => {
    expect(getRatesForDate(rates, "2024-06-11")).toEqual({ USDEUR: 0.92 });
    expect(getRatesForDate(rates, new Date(2024, 5, 15))).toEqual({ USDEUR: 0.93 });
  });

  it("gives up after a week", () => {
    expect(getRatesForDate(rates, "2024-06-20")).toEqual({});
  });
});
