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
