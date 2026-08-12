import { BenchmarkIndex } from "@/lib/benchmarks";
import { AssetsHistoricalData, BenchmarkData, CashEvent, CashFlow, PortfolioEvent, PortfolioValue } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT } from "@/lib/xlsx-parser/consts";
import merge from "lodash-es/merge";

export const getInitialPortfolioState = (day: Date) =>
  ({
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
    benchmarkData: Object.values(BenchmarkIndex).reduce(
      (all, index) => ({
        ...all,
        [index]: { stock: { volume: 0 }, stockValue: 0, oneDayProfit: 0, dailyReturn: 0 },
      }),
      {} as Record<BenchmarkIndex, BenchmarkData>,
    ),
  }) as PortfolioValue;

export const initialBenchmarkData = Object.values(BenchmarkIndex).reduce(
  (all, index) => ({
    ...all,
    [index]: { stock: { volume: 0 }, stockValue: 0, oneDayProfit: 0, dailyReturn: 0 },
  }),
  {} as Record<BenchmarkIndex, BenchmarkData>,
);

export function getDailyReturn(
  previousAccPortfolioValue: number,
  current: { oneDayProfit: number; date: Date },
): number {
  if (previousAccPortfolioValue === 0) {
    return 0;
  } else {
    const odp = current.oneDayProfit / previousAccPortfolioValue;
    if (odp > 0.2 || odp < -0.2) {
      console.warn(`Unusually large one-day profit/loss detected on ${current.date}: ${odp * 100}%`);
      return 0;
    } else {
      return current.oneDayProfit / previousAccPortfolioValue;
    }
  }
}

export function buildAssetsEventHistory(
  stockClosedPositionsOpenEvents: PortfolioEvent[],
  stockCloseEvents: PortfolioEvent[],
): AssetsHistoricalData {
  return stockClosedPositionsOpenEvents.concat(stockCloseEvents).reduce((acc, stockEvent) => {
    const stockSymbol = "stockSymbol" in stockEvent ? stockEvent.stockSymbol : null;
    if (!stockSymbol) return acc;

    if (!acc[stockSymbol]) {
      acc[stockSymbol] = {
        openPositions: [],
        closeEvents: [],
        openEvents: [],
      };
    }

    if (stockEvent.type === STOCK_OPEN_EVENT) {
      return merge(acc, {
        [stockSymbol]: {
          openEvents: [
            ...(acc[stockSymbol]?.openEvents || []),
            {
              date: formatDate(new Date(stockEvent.date)),
              volume: stockEvent.stocksVolumeChange,
              stockPriceOnBuy: stockEvent.openPrice,
            },
          ],
        },
      });
    }

    if (stockEvent.type === STOCK_CLOSE_EVENT) {
      return merge(acc, {
        [stockSymbol]: {
          closeEvents: [
            ...(acc[stockSymbol]?.closeEvents || []),
            {
              date: formatDate(new Date(stockEvent.date)),
              volume: stockEvent.stocksVolumeChange,
              stockPriceOnSell: stockEvent.closePrice,
              profitOrLoss: stockEvent.profitOrLoss,
            },
          ],
        },
      });
    }

    return acc;
  }, {} as AssetsHistoricalData);
}

export function deriveOpenPositionsFromCashEvents(
  cashEvents: CashEvent[],
): Record<string, AssetsHistoricalData[string]["openPositions"]> {
  const buysBySymbol: Record<string, { volume: number; price: number; date: string }[]> = {};
  const sellVolumeBySymbol: Record<string, number> = {};

  for (const event of cashEvents) {
    const symbol = event.stockSymbol;
    if (!symbol || !event.stocksVolumeChange) continue;

    if (event.stocksVolumeChange > 0) {
      if (!buysBySymbol[symbol]) {
        buysBySymbol[symbol] = [];
      }
      buysBySymbol[symbol].push({
        volume: event.stocksVolumeChange,
        price: event.openPrice ?? 0,
        date: formatDate(new Date(event.date)),
      });
    } else {
      sellVolumeBySymbol[symbol] = (sellVolumeBySymbol[symbol] ?? 0) + Math.abs(event.stocksVolumeChange);
    }
  }

  return Object.entries(buysBySymbol).reduce(
    (acc, [symbol, buys]) => {
      let remainingSellVolume = sellVolumeBySymbol[symbol] ?? 0;
      const openLots: AssetsHistoricalData[string]["openPositions"] = [];

      for (const buy of buys.sort((a, b) => a.date.localeCompare(b.date))) {
        if (remainingSellVolume >= buy.volume - 1e-9) {
          remainingSellVolume = Math.max(0, remainingSellVolume - buy.volume);
          continue;
        }

        openLots.push({
          volume: buy.volume - remainingSellVolume,
          stockPriceOnBuy: buy.price,
          date: buy.date,
        });
        remainingSellVolume = 0;
      }

      if (openLots.length > 0) {
        acc[symbol] = openLots;
      }

      return acc;
    },
    {} as Record<string, AssetsHistoricalData[string]["openPositions"]>,
  );
}

export const getCashFlow = (cashEvents: CashEvent[]): CashFlow => {
  return cashEvents.reduce((acc, event) => {
    if (event.cashWithdrawalOrDeposit) {
      return [...acc, { date: formatDate(new Date(event.date)), amount: event.cashWithdrawalOrDeposit }];
    }
    return acc;
  }, [] as CashFlow);
};
