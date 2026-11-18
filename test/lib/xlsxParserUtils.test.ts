import {
  getClosedPositionRowIds,
  getPositionIdFromClosedPositionEventId,
  isLegacyClosedPositionEventId,
  parseStockVolumeAndPriceFromComment,
} from "@/lib/xlsx-parser/utils";
import { describe, expect, it } from "vitest";

describe("getClosedPositionRowIds", () => {
  it("gives distinct ids to rows of the same position closed at the same time", () => {
    // Rows from a real report: position 2349426142 split into whole and fractional shares
    const ids = getClosedPositionRowIds([
      { positionId: 2349426142, closeTime: 46325.341634641205, volume: 2 },
      { positionId: 2349426142, closeTime: 46325.341634641205, volume: 0.0914 },
    ]);

    expect(ids).toEqual(["2349426142:4002509517:2", "2349426142:4002509517:0.0914"]);
  });

  it("ignores sub-second differences in close time so ids are stable across exports", () => {
    const [first] = getClosedPositionRowIds([{ positionId: 1, closeTime: 46329.65344840278, volume: 1 }]);
    const [second] = getClosedPositionRowIds([{ positionId: 1, closeTime: 46329.653448391204, volume: 1 }]);

    expect(first).toBe(second);
  });

  it("disambiguates otherwise identical rows", () => {
    const row = { positionId: 1, closeTime: 46000.5, volume: 1 };

    expect(getClosedPositionRowIds([row, row, row])).toEqual([
      "1:3974443200:1",
      "1:3974443200:1:1",
      "1:3974443200:1:2",
    ]);
  });

  it("reads the position id back from current and legacy ids", () => {
    expect(getPositionIdFromClosedPositionEventId("2349426142:4002509517:2")).toBe("2349426142");
    expect(getPositionIdFromClosedPositionEventId("2349426142")).toBe("2349426142");
    expect(isLegacyClosedPositionEventId("2349426142")).toBe(true);
    expect(isLegacyClosedPositionEventId("2349426142:4002509517:2")).toBe(false);
  });
});

describe("parseStockVolumeAndPriceFromComment", () => {
  it.each([
    ["OPEN BUY 3/3.5669 @ 79.4290", 3, 79.429],
    ["OPEN BUY 0.5794 @ 351.59", 0.5794, 351.59],
    ["CLOSE BUY 0.8915 @ 224.34", 0.8915, 224.34],
    ["CLOSE BUY 3/3.5669 @ 79.2325", 3, 79.2325],
  ])("parses the older format without a ticker: %s", (comment, volume, price) => {
    expect(parseStockVolumeAndPriceFromComment(comment)).toEqual({ volume, price });
  });

  it.each([
    ["OPEN BUY IONQ.US 8/8.4244 @ 31.02", 8, 31.02],
    ["OPEN BUY IONQ.US 0.4244/8.4244 @ 31.02", 0.4244, 31.02],
    ["OPEN BUY ORCL.US 0.7159 @ 133.50", 0.7159, 133.5],
    ["CLOSE BUY IGLN.UK 5/5.6133 @ 76.2675", 5, 76.2675],
    ["CLOSE BUY IGLN.UK 0.7734 @ 77.1350", 0.7734, 77.135],
    ["OPEN BUY US100 1 @ 20000.5", 1, 20000.5],
  ])("parses the newer format with a ticker: %s", (comment, volume, price) => {
    expect(parseStockVolumeAndPriceFromComment(comment)).toEqual({ volume, price });
  });

  it("parses correction comments", () => {
    expect(parseStockVolumeAndPriceFromComment("Correction: BUY 0.2346 @ 438.42")).toEqual({
      volume: 0.2346,
      price: 438.42,
    });
  });

  it.each(["", "ORCL.US USD 0.5/ SHR", "Profit of position #1996121009", "SMCI.US split 10 for 1"])(
    "returns zeros for non-trade comments: %s",
    (comment) => {
      expect(parseStockVolumeAndPriceFromComment(comment)).toEqual({ volume: 0, price: 0 });
    },
  );
});
