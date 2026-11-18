import { buildAssetsEventHistory, deriveOpenPositionsFromCashEvents } from "@/client/analysis/analysisUtil";
import { CashEvent, PortfolioEvent, StockMarketData, TickerMarketData } from "@/lib/types";
import { CASH_EVENT, STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT } from "@/lib/xlsx-parser/consts";
import { describe, expect, it } from "vitest";

// SMCI.US 10:1 split, effective 2024-10-01. Prices below are already split-adjusted (as after `adjustEventPrices`),
// volumes are as traded: 0.4453 shares bought at 791.41 (= 79.141 adjusted), closed at 416.4 (= 41.64 adjusted).
const stockMarketData = {
  "SMCI.US": { splits: [{ effective_date: "2024-10-01", split_factor: 10 }] } as unknown as TickerMarketData,
} as StockMarketData;

describe("buildAssetsEventHistory", () => {
  const openEvent: PortfolioEvent = {
    id: "1",
    type: STOCK_OPEN_EVENT,
    date: "2024-06-13T11:30:03.000Z",
    stockSymbol: "SMCI.US",
    stocksVolumeChange: 0.4453,
    openPrice: 79.141,
  };
  const closeEvent: PortfolioEvent = {
    id: "1",
    type: STOCK_CLOSE_EVENT,
    date: "2024-09-30T19:50:32.000Z",
    stockSymbol: "SMCI.US",
    stocksVolumeChange: 0.4453,
    closePrice: 41.64,
    profitOrLoss: -167.19,
  };

  it("split-adjusts volumes of events before a split, so volume × price matches the traded value", () => {
    const history = buildAssetsEventHistory([openEvent], [closeEvent], stockMarketData)["SMCI.US"];

    expect(history.openEvents[0].volume).toBeCloseTo(4.453);
    expect(history.openEvents[0].volume * history.openEvents[0].stockPriceOnBuy).toBeCloseTo(0.4453 * 791.41);
    expect(history.closeEvents[0].volume).toBeCloseTo(4.453);
    expect(history.closeEvents[0].stockPriceOnSell).toBe(41.64);
    expect(history.closeEvents[0].profitOrLoss).toBe(-167.19);
  });

  it("leaves volumes untouched without split data", () => {
    const history = buildAssetsEventHistory([openEvent], [closeEvent])["SMCI.US"];
    expect(history.openEvents[0].volume).toBe(0.4453);
  });
});

describe("deriveOpenPositionsFromCashEvents", () => {
  const cashEvent = (id: string, date: string, stocksVolumeChange: number, openPrice: number): CashEvent => ({
    id,
    type: CASH_EVENT,
    date,
    stockSymbol: "SMCI.US",
    stocksVolumeChange,
    openPrice,
    cashChange: 0,
    cashWithdrawalOrDeposit: null,
  });

  it("matches pre-split buys against post-split sells in split-adjusted shares", () => {
    const openPositions = deriveOpenPositionsFromCashEvents(
      [
        cashEvent("1", "2024-06-13T11:30:03.000Z", 1, 79.141), // 1 share pre-split = 10 shares now
        cashEvent("2", "2024-11-05T14:14:57.000Z", -4, 25.43), // sell 4 of them after the split
      ],
      stockMarketData,
    )["SMCI.US"];

    expect(openPositions).toHaveLength(1);
    expect(openPositions[0].volume).toBeCloseTo(6);
    expect(openPositions[0].stockPriceOnBuy).toBe(79.141);
  });
});

describe("deriveOpenPositionsFromCashEvents with XTB position ids", () => {
  const trade = (
    positionId: string,
    date: string,
    stocksVolumeChange: number,
    openPrice: number,
    stockSymbol = "SMCI.US",
  ): CashEvent => ({
    id: `${positionId}-${date}-${stocksVolumeChange}`,
    type: CASH_EVENT,
    date,
    stockSymbol,
    stocksVolumeChange,
    openPrice,
    positionId,
    cashChange: 0,
    cashWithdrawalOrDeposit: null,
  });

  // Splits as fetched from Yahoo: effective at the market open of the first post-split session
  const marketData = {
    "SMCI.US": {
      splits: [{ effective_date: "2024-10-01", effective_time: "2024-10-01T13:30:00.000Z", split_factor: 10 }],
    },
    "RYAAY.US": {
      splits: [{ effective_date: "2024-09-30", effective_time: "2024-09-30T13:30:00.000Z", split_factor: 2.499 }],
    },
  } as unknown as StockMarketData;

  it("leaves nothing open when a position bought before a split is sold after it (RYAAY ADR ratio change)", () => {
    // XTB kept the volume and compensated the price drop in cash
    const openPositions = deriveOpenPositionsFromCashEvents(
      [
        trade("1356055667", "2024-06-14T13:30:00.000Z", 0.8435, 46.72, "RYAAY.US"),
        trade("1356055667", "2024-10-01T19:01:00.000Z", -0.8435, 44.54, "RYAAY.US"),
      ],
      marketData,
    );

    expect(openPositions["RYAAY.US"]).toBeUndefined();
  });

  it("leaves nothing open for SMCI positions cashed out before the split and a buy later on the split day", () => {
    const openPositions = deriveOpenPositionsFromCashEvents(
      [
        trade("1354504083", "2024-06-13T13:30:00.000Z", 0.6453, 79.141),
        trade("1354504083", "2024-06-14T13:30:00.000Z", -0.2, 84.5),
        trade("1354504083", "2024-10-01T07:20:00.000Z", -0.4453, 79.141), // XTB cash-out ("Correction: BUY")
        trade("1478218745", "2024-10-01T19:03:00.000Z", 2.4497, 40.81), // bought after the split took effect
        trade("1478218745", "2024-11-05T15:14:00.000Z", -2.4497, 25.44),
      ],
      marketData,
    );

    expect(openPositions["SMCI.US"]).toBeUndefined();
  });

  it("offsets a sell booked against the sibling position of the same order", () => {
    const openPositions = deriveOpenPositionsFromCashEvents(
      [
        // One order split into the whole and the fractional part, opened at the same time
        trade("2348060369", "2026-02-03T08:10:00.000Z", 2, 95.385, "IGLN.UK"),
        trade("2348061548", "2026-02-03T08:10:00.000Z", 0.6358, 95.385, "IGLN.UK"),
        // All 2.6358 shares closed against the first position
        trade("2348060369", "2026-10-22T07:43:00.000Z", -2.6358, 79.34, "IGLN.UK"),
        // A later, still open position
        trade("2572033490", "2026-05-12T14:07:00.000Z", 5.6133, 90.9164, "IGLN.UK"),
      ],
      marketData,
    );

    expect(openPositions["IGLN.UK"]).toEqual([{ volume: 5.6133, stockPriceOnBuy: 90.9164, date: "2026-05-12" }]);
  });

  it("returns a partially closed position with its average buy price, split-adjusted", () => {
    const openPositions = deriveOpenPositionsFromCashEvents(
      [
        trade("1", "2024-06-13T13:30:00.000Z", 0.5, 80),
        trade("1", "2024-06-13T13:30:01.000Z", 0.5, 82),
        trade("1", "2024-07-01T13:30:00.000Z", -0.4, 90),
      ],
      marketData,
    )["SMCI.US"];

    expect(openPositions).toHaveLength(1);
    expect(openPositions[0].volume).toBeCloseTo(6); // 0.6 shares pre-split = 6 now
    expect(openPositions[0].stockPriceOnBuy).toBeCloseTo(81);
  });
});
