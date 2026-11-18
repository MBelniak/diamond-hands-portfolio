import { mergePortfolioEvents } from "@/lib/xlsx-parser/mergePortfolioEvents";
import type { CashEvent, PortfolioEvent, PortfolioEvents } from "@/lib/types";
import { describe, expect, it } from "vitest";

const closeEvent = (id: string, stocksVolumeChange: number): PortfolioEvent => ({
  id,
  date: "2026-11-05T15:41:00.000Z",
  type: "stockCloseEvent",
  stockSymbol: "IGLN.UK",
  stocksVolumeChange,
  profitOrLoss: 0,
  closePrice: 76.2675,
});

const cashEvent = (id: string, cashChange: number): CashEvent => ({
  id,
  date: "2026-11-05T15:41:00.000Z",
  type: "cash",
  cashChange,
  cashWithdrawalOrDeposit: null,
});

const events = (partial: Partial<PortfolioEvents>): PortfolioEvents => ({
  cashEvents: [],
  closedStocksOpenEvents: [],
  closedStocksCloseEvents: [],
  ...partial,
});

const ids = (list: { id: string }[]) => list.map((event) => event.id).sort();

describe("mergePortfolioEvents", () => {
  it("keeps every row of a position that was split into several rows", () => {
    const incoming = events({
      closedStocksCloseEvents: [
        closeEvent("2572033490:3988031035:5", 5),
        closeEvent("2572033490:3988031035:0.3918", 0.3918),
      ],
    });

    const merged = mergePortfolioEvents(events({}), incoming);

    expect(ids(merged.closedStocksCloseEvents)).toEqual(["2572033490:3988031035:0.3918", "2572033490:3988031035:5"]);
  });

  it("replaces stored events with the same id and keeps stored events the upload doesn't cover", () => {
    const existing = events({
      cashEvents: [cashEvent("1", 100), cashEvent("2", 200)],
      closedStocksCloseEvents: [closeEvent("111:100:1", 1), closeEvent("222:100:2", 2)],
    });
    const incoming = events({
      cashEvents: [cashEvent("2", 250), cashEvent("3", 300)],
      closedStocksCloseEvents: [closeEvent("222:100:2", 2), closeEvent("333:100:3", 3)],
    });

    const merged = mergePortfolioEvents(existing, incoming);

    expect(ids(merged.cashEvents)).toEqual(["1", "2", "3"]);
    expect(merged.cashEvents.find((event) => event.id === "2")?.cashChange).toBe(250);
    expect(ids(merged.closedStocksCloseEvents)).toEqual(["111:100:1", "222:100:2", "333:100:3"]);
  });

  it("replaces legacy (Position ID only) events with the uploaded rows of that position", () => {
    const existing = events({
      // Stored before ids were unique: the 0.3918 row of this position was lost when deduplicating by Position ID
      closedStocksCloseEvents: [closeEvent("2572033490", 5), closeEvent("1210905347", 0.5102)],
    });
    const incoming = events({
      closedStocksCloseEvents: [
        closeEvent("2572033490:3988031035:5", 5),
        closeEvent("2572033490:3988031035:0.3918", 0.3918),
      ],
    });

    const merged = mergePortfolioEvents(existing, incoming);

    // The legacy event of a position not covered by the upload is kept
    expect(ids(merged.closedStocksCloseEvents)).toEqual([
      "1210905347",
      "2572033490:3988031035:0.3918",
      "2572033490:3988031035:5",
    ]);
  });
});
