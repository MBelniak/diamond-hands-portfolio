import { BenchmarkIndex } from "@/lib/benchmarks";
import {
  AssetsHistoricalData,
  BenchmarkData,
  CashEvent,
  CashFlow,
  PortfolioEvent,
  PortfolioValue,
  Split,
  StockMarketData,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { getSplitFactor } from "@/lib/splits";
import { STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT } from "@/lib/xlsx-parser/consts";

const getEmptyBenchmarkData = () =>
  Object.fromEntries(
    Object.values(BenchmarkIndex).map((index) => [
      index,
      { stock: { volume: 0 }, stockValue: 0, oneDayProfit: 0, dailyReturn: 0 },
    ]),
  ) as Record<BenchmarkIndex, BenchmarkData>;

export const getInitialPortfolioState = (day: Date): PortfolioValue => ({
  date: formatDate(day),
  cash: 0,
  balance: 0,
  totalCapitalInvested: 0,
  oneDayProfit: 0,
  dailyReturn: 0,
  accPortfolioValue: 0,
  stocks: {},
  portfolioValue: 0,
  realizedProfitOrLoss: 0,
  profit: 0,
  loss: 0,
  profitOrLoss: 0,
  benchmarkData: getEmptyBenchmarkData(),
});

export const initialBenchmarkData = getEmptyBenchmarkData();

export function getDailyReturn(
  previousAccPortfolioValue: number,
  current: { oneDayProfit: number; date: Date },
): number {
  if (previousAccPortfolioValue === 0) return 0;
  const dailyReturn = current.oneDayProfit / previousAccPortfolioValue;
  if (Math.abs(dailyReturn) > 0.2) {
    console.warn(`Unusually large one-day profit/loss detected on ${current.date}: ${dailyReturn * 100}%`);
    return 0;
  }
  return dailyReturn;
}

/**
 * Builds per-asset open/close history. Prices on the events are already split-adjusted (see `adjustEventPrices`),
 * so volumes are split-adjusted here too, keeping volume × price equal to the traded value.
 */
export function buildAssetsEventHistory(
  stockClosedPositionsOpenEvents: PortfolioEvent[],
  stockCloseEvents: PortfolioEvent[],
  stockMarketData?: StockMarketData,
): AssetsHistoricalData {
  const history: AssetsHistoricalData = {};
  for (const stockEvent of stockClosedPositionsOpenEvents.concat(stockCloseEvents)) {
    if (!stockEvent.stockSymbol) continue;
    const asset = (history[stockEvent.stockSymbol] ??= { openPositions: [], closeEvents: [], openEvents: [] });
    const date = formatDate(new Date(stockEvent.date));
    const volume =
      (stockEvent.stocksVolumeChange ?? 0) *
      getSplitFactor(stockMarketData?.[stockEvent.stockSymbol]?.splits, stockEvent.date);

    if (stockEvent.type === STOCK_OPEN_EVENT) {
      asset.openEvents.push({ date, volume, stockPriceOnBuy: stockEvent.openPrice });
    } else if (stockEvent.type === STOCK_CLOSE_EVENT) {
      asset.closeEvents.push({
        date,
        volume,
        stockPriceOnSell: stockEvent.closePrice,
        profitOrLoss: stockEvent.profitOrLoss,
      });
    }
  }
  return history;
}

type OpenLots = AssetsHistoricalData[string]["openPositions"];

const VOLUME_EPSILON = 1e-6;

/**
 * Open lots of one symbol, matching sells to buys by XTB position. XTB never changes the volume of a position (on a
 * split it cashes the position out or compensates in cash), so a position's buys and sells are netted in as-traded
 * shares - converting them with split factors of different dates would leave phantom shares behind.
 */
function deriveOpenLotsByPosition(events: CashEvent[], splits: Split[] | undefined): OpenLots {
  const positions = new Map<string, { net: number; buyVolume: number; buyValue: number; firstEventTime: number }>();

  for (const event of events) {
    const time = new Date(event.date).getTime();
    const position = positions.get(event.positionId!) ?? {
      net: 0,
      buyVolume: 0,
      buyValue: 0,
      firstEventTime: time,
    };
    const volume = event.stocksVolumeChange!;
    position.net += volume;
    position.firstEventTime = Math.min(position.firstEventTime, time);
    if (volume > 0) {
      position.buyVolume += volume;
      position.buyValue += volume * (event.openPrice ?? 0);
    }
    positions.set(event.positionId!, position);
  }

  // XTB sometimes books a sell against a sibling position of the same order (e.g. the whole vs the fractional part
  // of a purchase). Offset such over-closed positions against the open ones opened closest in time.
  for (const overClosed of positions.values()) {
    for (const sibling of [...positions.values()]
      .filter((position) => position.net > VOLUME_EPSILON)
      .sort(
        (a, b) =>
          Math.abs(a.firstEventTime - overClosed.firstEventTime) -
          Math.abs(b.firstEventTime - overClosed.firstEventTime),
      )) {
      if (overClosed.net >= -VOLUME_EPSILON) break;
      const matched = Math.min(sibling.net, -overClosed.net);
      sibling.net -= matched;
      overClosed.net += matched;
    }
  }

  return [...positions.values()]
    .filter((position) => position.net > VOLUME_EPSILON && position.buyVolume > 0)
    .sort((a, b) => a.firstEventTime - b.firstEventTime)
    .map((position) => ({
      // Prices are split-adjusted already, so adjust the volume too (volume × price = traded value)
      volume: position.net * getSplitFactor(splits, new Date(position.firstEventTime)),
      stockPriceOnBuy: position.buyValue / position.buyVolume,
      date: formatDate(new Date(position.firstEventTime)),
    }));
}

/** FIFO fallback for events stored before the XTB position id was parsed. */
function deriveOpenLotsFifo(events: CashEvent[], splits: Split[] | undefined): OpenLots {
  const buys: { volume: number; price: number; date: string }[] = [];
  let remainingSellVolume = 0;

  for (const event of events) {
    // Adjust both buys and sells, so FIFO matching compares like with like across a split
    const volume = event.stocksVolumeChange! * getSplitFactor(splits, event.date);
    if (volume > 0) {
      buys.push({ volume, price: event.openPrice ?? 0, date: formatDate(new Date(event.date)) });
    } else {
      remainingSellVolume += Math.abs(volume);
    }
  }

  const openLots: OpenLots = [];
  for (const buy of buys.sort((a, b) => a.date.localeCompare(b.date))) {
    if (remainingSellVolume >= buy.volume - 1e-9) {
      remainingSellVolume = Math.max(0, remainingSellVolume - buy.volume);
      continue;
    }
    openLots.push({ volume: buy.volume - remainingSellVolume, stockPriceOnBuy: buy.price, date: buy.date });
    remainingSellVolume = 0;
  }
  return openLots;
}

/** Derives the currently open lots from cash buy/sell operations, with split-adjusted volumes. */
export function deriveOpenPositionsFromCashEvents(
  cashEvents: CashEvent[],
  stockMarketData?: StockMarketData,
): Record<string, OpenLots> {
  const tradesBySymbol: Record<string, CashEvent[]> = {};
  for (const event of cashEvents) {
    if (!event.stockSymbol || !event.stocksVolumeChange) continue;
    (tradesBySymbol[event.stockSymbol] ??= []).push(event);
  }

  const result: Record<string, OpenLots> = {};
  for (const [symbol, trades] of Object.entries(tradesBySymbol)) {
    const splits = stockMarketData?.[symbol]?.splits;
    const openLots = trades.every((event) => event.positionId)
      ? deriveOpenLotsByPosition(trades, splits)
      : deriveOpenLotsFifo(trades, splits);
    if (openLots.length > 0) {
      result[symbol] = openLots;
    }
  }
  return result;
}

export const getCashFlow = (cashEvents: CashEvent[]): CashFlow =>
  cashEvents
    .filter((event) => event.cashWithdrawalOrDeposit)
    .map((event) => ({ date: formatDate(new Date(event.date)), amount: event.cashWithdrawalOrDeposit! }));
