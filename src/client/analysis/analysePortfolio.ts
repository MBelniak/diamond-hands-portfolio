import {
  type AssetsHistoricalData,
  CashEvent,
  CashFlow,
  PortfolioAnalysis,
  PortfolioData,
  PortfolioEvent,
  PortfolioValue,
  Stock,
  StockMarketData,
} from "@/lib/types";
import { addYears, isSameDay } from "date-fns";
import { formatDate } from "../../lib/utils";
import { addDays } from "date-fns/addDays";
import { CASH, STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT } from "@/lib/xlsx-parser/consts";
import { cloneDeep, merge } from "lodash-es";
import { getDateRange } from "../../lib/xlsx-parser/utils";
import { BenchmarkIndex } from "@/lib/benchmarks";

function getInitialBenchmarkStockRecord(): Record<BenchmarkIndex, Stock> {
  return Object.values(BenchmarkIndex).reduce(
    (all, index) => ({
      ...all,
      [index]: { volume: 0 },
    }),
    {} as Record<BenchmarkIndex, Stock>,
  );
}

function getInitialBenchmarkValueRecord(): Record<BenchmarkIndex, number> {
  return Object.values(BenchmarkIndex).reduce(
    (all, index) => ({
      ...all,
      [index]: 0,
    }),
    {} as Record<BenchmarkIndex, number>,
  );
}

function getStocksValueCached(stocks: Record<string, Stock>, date: Date, stockMarketData: StockMarketData): number {
  let stocksValue = 0;
  const dateKey = formatDate(date);
  for (const symbol in stocks) {
    const tickerMarketData = stockMarketData[symbol]?.tickerQuoteByDateString;
    if (!(dateKey in tickerMarketData)) {
      let recentDate = addDays(date, -1);
      while (recentDate >= addDays(date, -30)) {
        if (formatDate(recentDate) in stockMarketData[symbol]?.tickerQuoteByDateString) {
          tickerMarketData[dateKey] = cloneDeep(tickerMarketData[formatDate(recentDate)]);
          tickerMarketData[dateKey] = cloneDeep(tickerMarketData[formatDate(recentDate)]);
          break;
        }
        recentDate = addDays(recentDate, -1);
      }
    }

    const closePrice = stockMarketData[symbol]?.tickerQuoteByDateString[dateKey]?.close ?? null;
    if (closePrice !== null) {
      stocksValue += closePrice * stocks[symbol].volume;
    }
  }
  return stocksValue;
}

function getNextDayPortfolioValue(
  previousState: PortfolioValue,
  date: Date,
  stockMarketData: StockMarketData,
): PortfolioValue {
  const dateKey = formatDate(date);

  return {
    date: formatDate(date),
    cash: previousState.cash,
    balance: previousState.balance,
    oneDayProfit:
      getStocksValueCached(previousState.stocks, date, stockMarketData) -
      getStocksValueCached(previousState.stocks, addDays(date, -1), stockMarketData),
    totalCapitalInvested: previousState.totalCapitalInvested,
    stocks: Object.fromEntries(
      Object.entries(previousState.stocks).map(([symbol, stock]) => [
        symbol,
        {
          ...stock,
          splitAdjustedTickerQuote: stockMarketData[symbol]?.splitAdjustedTickerQuoteByDateString[dateKey],
          tickerQuote: stockMarketData[symbol]?.tickerQuoteByDateString[dateKey],
        },
      ]),
    ),
    portfolioValue: previousState.cash + getStocksValueCached(previousState.stocks, date, stockMarketData),
    profitOrLoss: previousState.profitOrLoss,
    benchmarkOneDayProfit: Object.values(BenchmarkIndex).reduce(
      (all, index) => {
        const benchmarkStock = { [index]: { volume: previousState.benchmarkStock?.[index].volume || 0 } };

        return {
          ...all,
          [index]:
            getStocksValueCached(benchmarkStock, date, stockMarketData) -
            getStocksValueCached(benchmarkStock, addDays(date, -1), stockMarketData),
        };
      },
      {} as Record<BenchmarkIndex, number>,
    ),
    benchmarkStockValue: Object.values(BenchmarkIndex).reduce(
      (all, index) => {
        const benchmarkStock = { [index]: { volume: previousState.benchmarkStock?.[index].volume || 0 } };

        return {
          ...all,
          [index]: getStocksValueCached(benchmarkStock!, date, stockMarketData),
        };
      },
      {} as Record<BenchmarkIndex, number>,
    ),
    benchmarkStock: Object.values(BenchmarkIndex).reduce(
      (all, index) => {
        return {
          ...all,
          [index]: {
            volume: previousState.benchmarkStock?.[index].volume || 0,
            price: stockMarketData[index]?.tickerQuoteByDateString[dateKey],
          },
        };
      },
      {} as Record<BenchmarkIndex, Stock>,
    ),
  };
}

function getPortfolioValueOnEventDay(
  cash: number,
  balance: number,
  totalCapitalInvested: number,
  stocks: Record<string, Stock>,
  profitOrLoss: number,
  benchmarkVolume: Record<BenchmarkIndex, Stock>,
  date: Date,
  stockMarketData: StockMarketData,
  previousState: PortfolioValue,
): PortfolioValue {
  const dateKey = formatDate(date);

  return {
    cash: cash >= 0 ? cash : 0,
    balance,
    profitOrLoss,
    totalCapitalInvested,
    oneDayProfit:
      getStocksValueCached(previousState.stocks, date, stockMarketData) -
      getStocksValueCached(previousState.stocks, addDays(date, -1), stockMarketData),
    date: formatDate(date),
    stocks: Object.fromEntries(
      Object.entries(stocks).map(([symbol, stock]) => [
        symbol,
        {
          ...stock,
          splitAdjustedTickerQuote: stockMarketData[symbol]?.splitAdjustedTickerQuoteByDateString[dateKey],
          tickerQuote: stockMarketData[symbol]?.tickerQuoteByDateString[dateKey],
        },
      ]),
    ),
    portfolioValue: cash + getStocksValueCached(stocks, date, stockMarketData),
    benchmarkOneDayProfit: Object.values(BenchmarkIndex).reduce(
      (all, index) => {
        const benchmarkStock = { [index]: { volume: benchmarkVolume[index]?.volume || 0 } };

        return {
          ...all,
          [index]:
            getStocksValueCached(benchmarkStock, date, stockMarketData) -
            getStocksValueCached(benchmarkStock, addDays(date, -1), stockMarketData),
        };
      },
      {} as Record<BenchmarkIndex, number>,
    ),
    benchmarkStock: Object.values(BenchmarkIndex).reduce(
      (all, index) => {
        return {
          ...all,
          [index]: {
            volume: previousState.benchmarkStock?.[index].volume || 0,
            price: stockMarketData[index]?.tickerQuoteByDateString[dateKey] ?? undefined,
          },
        };
      },
      {} as Record<BenchmarkIndex, Stock>,
    ),
    benchmarkStockValue: Object.values(BenchmarkIndex).reduce(
      (all, index) => {
        const benchmarkStock = { [index]: { volume: benchmarkVolume[index]?.volume || 0 } };
        return {
          ...all,
          [index]: getStocksValueCached(benchmarkStock!, date, stockMarketData),
        };
      },
      {} as Record<BenchmarkIndex, number>,
    ),
  };
}

function getAssetsAnalysis(
  cashEvents: CashEvent[],
  stockClosedPositionsOpenEvents: PortfolioEvent[],
  stockCloseEvents: PortfolioEvent[],
): AssetsHistoricalData {
  // Build open/close event history from the closed-positions sheet (unchanged)
  const result: AssetsHistoricalData = stockClosedPositionsOpenEvents
    .concat(stockCloseEvents)
    .reduce((acc, stockEvent) => {
      const stockSymbol = "stockSymbol" in stockEvent ? stockEvent["stockSymbol"] : null;
      if (!stockSymbol) return acc;

      if (!acc[stockSymbol]) {
        acc[stockSymbol] = {
          openPositions: [],
          closeEvents: [],
          openEvents: [],
        };
      }

      if (stockEvent.type === STOCK_OPEN_EVENT) {
        const stockSymbol = stockEvent.stockSymbol;
        if (!stockSymbol) return acc;

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
      } else if (stockEvent.type === STOCK_CLOSE_EVENT) {
        const stockSymbol = stockEvent.stockSymbol;
        if (!stockSymbol) return acc;

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

  // Derive currently open positions from cash buy/sell events using FIFO
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

  for (const [symbol, buys] of Object.entries(buysBySymbol)) {
    let remainingSellVolume = sellVolumeBySymbol[symbol] ?? 0;
    const openLots: AssetsHistoricalData[string]["openPositions"] = [];

    for (const buy of buys.sort((a, b) => a.date.localeCompare(b.date))) {
      if (remainingSellVolume >= buy.volume - 1e-9) {
        remainingSellVolume = Math.max(0, remainingSellVolume - buy.volume);
      } else {
        openLots.push({
          volume: buy.volume - remainingSellVolume,
          stockPriceOnBuy: buy.price,
          date: buy.date,
        });
        remainingSellVolume = 0;
      }
    }

    if (openLots.length > 0) {
      if (!result[symbol]) {
        result[symbol] = { openPositions: [], closeEvents: [], openEvents: [] };
      }
      result[symbol].openPositions = openLots;
    }
  }

  return result;
}

/**
 * Main function: for each day fetches the close price and calculates the portfolio value
 */
function getPortfolioValueData(portfolioEvents: PortfolioEvent[], stockMarketData: StockMarketData): PortfolioValue[] {
  let cash = 0;
  let balance = 0;
  let totalCapitalInvested = 0;
  let profitOrLoss = 0;

  const stocks = {} as Record<string, Stock>;
  // Date range
  const startDate = addYears(new Date(), -3);
  const allDates = getDateRange(startDate, new Date());

  // For each date, find the portfolio state (cash, stocks) and fetch the close price
  const result: PortfolioValue[] = [];
  for (const day of allDates) {
    // Find events for this day
    const dayEvents = portfolioEvents.filter((t) => isSameDay(t.date, day));

    if (dayEvents.length === 0) {
      const previousState = result.at(-1);
      if (!previousState) {
        result.push({
          date: formatDate(day),
          cash: 0,
          balance: 0,
          totalCapitalInvested: 0,
          oneDayProfit: 0,
          benchmarkOneDayProfit: getInitialBenchmarkValueRecord(),
          stocks: {},
          portfolioValue: 0,
          profitOrLoss: 0,
          benchmarkStock: getInitialBenchmarkStockRecord(),
          benchmarkStockValue: getInitialBenchmarkValueRecord(),
        });
        continue;
      }

      result.push(getNextDayPortfolioValue(previousState, day, stockMarketData));
    } else {
      for (const event of dayEvents) {
        if (event.type === CASH) {
          cash += event.cashChange;
          if (event.cashWithdrawalOrDeposit) {
            balance += event.cashWithdrawalOrDeposit;
            if (event.cashWithdrawalOrDeposit > 0) {
              totalCapitalInvested += event.cashWithdrawalOrDeposit;
            }
          }
          // Track stock volume changes from cash buy/sell operations
          if (event.stockSymbol && event.stocksVolumeChange) {
            if (!(event.stockSymbol in stocks)) {
              stocks[event.stockSymbol] = { volume: 0 };
            }
            const newVolume = stocks[event.stockSymbol].volume + event.stocksVolumeChange;
            stocks[event.stockSymbol] = {
              ...stocks[event.stockSymbol],
              volume: newVolume <= 1e-6 ? 0 : Math.max(0, newVolume),
            };
          }
        } else if (event.type === STOCK_CLOSE_EVENT && event.stockSymbol) {
          // Volume is tracked via CASH events; only accumulate P&L from closed positions here
          if (event.stockSymbol in stocks) {
            stocks[event.stockSymbol] = {
              ...stocks[event.stockSymbol],
              takenProfitOrLoss: (stocks[event.stockSymbol].takenProfitOrLoss ?? 0) + event.profitOrLoss,
            };
          }
          profitOrLoss += event.profitOrLoss || 0;
        }
      }

      const benchmarkStockVolume = result.at(-1)?.benchmarkStock ?? getInitialBenchmarkStockRecord();
      if (dayEvents.some((e) => e.type === CASH)) {
        const benchmarkPricesNotAvailable = Object.keys(benchmarkStockVolume).every(
          (index) => !stockMarketData[index]?.tickerQuoteByDateString[formatDate(day)],
        );
        if (benchmarkPricesNotAvailable) {
          continue;
        }

        Object.keys(benchmarkStockVolume).forEach((index) => {
          const benchmarkStockPrice = stockMarketData[index]?.tickerQuoteByDateString[formatDate(day)] || null;
          if (benchmarkStockPrice === null || benchmarkStockPrice.close == null) {
            console.warn(`No ${index} price for date: `, formatDate(day));
            return;
          }
          const depositBalance = dayEvents
            .filter(
              (e): e is PortfolioEvent & { type: typeof CASH } =>
                e.type === CASH && !!e.cashWithdrawalOrDeposit && e.cashWithdrawalOrDeposit > 0,
            )
            .reduce((acc, e) => acc + e.cashWithdrawalOrDeposit!, 0);

          benchmarkStockVolume[index as BenchmarkIndex].volume += depositBalance / benchmarkStockPrice.close;
        });
      }

      result.push(
        getPortfolioValueOnEventDay(
          cash,
          balance,
          totalCapitalInvested,
          stocks,
          profitOrLoss,
          benchmarkStockVolume,
          day,
          stockMarketData,
          result.at(-1)!,
        ),
      );
    }
  }

  return result;
}

const getCashFlow = (cashEvents: CashEvent[]): CashFlow => {
  return cashEvents.reduce((acc, event) => {
    if (event.cashWithdrawalOrDeposit) {
      return [...acc, { date: formatDate(new Date(event.date)), amount: event.cashWithdrawalOrDeposit }];
    }
    return acc;
  }, [] as CashFlow);
};

export const analysePortfolio = (portfolioData: PortfolioData): PortfolioAnalysis => {
  const { cashEvents, closedStocksOpenEvents, closedStocksCloseEvents } = portfolioData.portfolioEvents;

  // Timeline only needs cash events (volume + cash tracking) and close events (P&L)
  const allEvents = [...cashEvents, ...closedStocksCloseEvents].toSorted(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const portfolioTimeline = getPortfolioValueData(allEvents, portfolioData.stockMarketData);

  const assetsAnalysis = getAssetsAnalysis(cashEvents, closedStocksOpenEvents, closedStocksCloseEvents);
  const cashFlow = getCashFlow(cashEvents);

  return {
    assetsAnalysis,
    portfolioTimeline,
    stockMarketData: portfolioData.stockMarketData,
    cashFlow,
  };
};
