import {
  type AssetsHistoricalData,
  CashEvent,
  CashFlow,
  PortfolioAnalysis,
  PortfolioData,
  PortfolioEvent,
  PortfolioValue,
  Stock,
  StockMarketDataMap,
} from "@/lib/types";
import { addYears, isSameDay } from "date-fns";
import { formatDate } from "../../lib/utils";
import { addDays } from "date-fns/addDays";
import { CASH_EVENT, STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT } from "@/lib/xlsx-parser/consts";
import { cloneDeep, merge } from "lodash-es";
import { getDateRange } from "../../lib/xlsx-parser/utils";
import { BenchmarkIndex } from "@/lib/benchmarks";
import { calculateRiskMetrics, getTimelineWindow } from "@/lib/riskMetrics";

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

function getStocksValueCached(stocks: Record<string, Stock>, date: Date, stockMarketData: StockMarketDataMap): number {
  let stocksValue = 0;
  const dateKey = formatDate(date);
  for (const symbol in stocks) {
    const marketData = stockMarketData.get(symbol);
    if (!marketData) {
      continue;
    }
    const tickerMarketData = marketData.tickerQuoteByDateString;
    if (!tickerMarketData) {
      continue;
    }
    if (!(dateKey in tickerMarketData)) {
      let recentDate = addDays(date, -1);
      while (recentDate >= addDays(date, -30)) {
        if (formatDate(recentDate) in tickerMarketData) {
          tickerMarketData[dateKey] = cloneDeep(tickerMarketData[formatDate(recentDate)]);
          tickerMarketData[dateKey] = cloneDeep(tickerMarketData[formatDate(recentDate)]);
          break;
        }
        recentDate = addDays(recentDate, -1);
      }
    }

    const currentPrice = tickerMarketData[dateKey]?.regularMarketPrice ?? tickerMarketData[dateKey]?.close ?? null;
    if (currentPrice !== null) {
      stocksValue += currentPrice * stocks[symbol].volume;
    }
  }
  return stocksValue;
}

function getNextDayPortfolioValue(
  previousState: PortfolioValue,
  date: Date,
  stockMarketData: StockMarketDataMap,
): PortfolioValue {
  const dateKey = formatDate(date);
  const portfolioValue = previousState.cash + getStocksValueCached(previousState.stocks, date, stockMarketData);
  const accPortfolioValue = portfolioValue + (previousState.totalCapitalInvested - previousState.balance);

  return {
    date: formatDate(date),
    cash: previousState.cash,
    balance: previousState.balance,
    oneDayProfit: portfolioValue - previousState.portfolioValue,
    totalCapitalInvested: previousState.totalCapitalInvested,
    stocks: Object.fromEntries(
      Object.entries(previousState.stocks).map(([symbol, stock]) => [
        symbol,
        {
          ...stock,
          splitAdjustedTickerQuote: stockMarketData.get(symbol)?.splitAdjustedTickerQuoteByDateString[dateKey],
          tickerQuote: stockMarketData.get(symbol)?.tickerQuoteByDateString[dateKey],
        },
      ]),
    ),
    portfolioValue,
    accPortfolioValue,
    profitOrLoss: previousState.profitOrLoss,
    benchmarkOneDayProfit: Object.values(BenchmarkIndex).reduce(
      (all, index) => {
        const benchmarkStock = { [index]: { volume: previousState.benchmarkStock?.[index].volume || 0 } };

        return {
          ...all,
          [index]:
            getStocksValueCached(benchmarkStock, date, stockMarketData) - previousState.benchmarkStockValue[index],
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
      (all, indexTicker) => {
        return {
          ...all,
          [indexTicker]: {
            volume: previousState.benchmarkStock?.[indexTicker].volume || 0,
            price: stockMarketData.get(indexTicker)?.tickerQuoteByDateString[dateKey],
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
  stockMarketData: StockMarketDataMap,
  previousState: PortfolioValue,
): PortfolioValue {
  const dateKey = formatDate(date);
  const portfolioValue = cash + getStocksValueCached(stocks, date, stockMarketData);
  const accPortfolioValue = portfolioValue + (totalCapitalInvested - balance);

  return {
    cash: cash >= 0 ? cash : 0,
    balance,
    profitOrLoss,
    totalCapitalInvested,
    oneDayProfit: portfolioValue - balance - (previousState.portfolioValue - previousState.balance),
    date: formatDate(date),
    stocks: Object.fromEntries(
      Object.entries(stocks).map(([symbol, stock]) => [
        symbol,
        {
          ...stock,
          splitAdjustedTickerQuote: stockMarketData.get(symbol)?.splitAdjustedTickerQuoteByDateString[dateKey],
          tickerQuote: stockMarketData.get(symbol)?.tickerQuoteByDateString[dateKey],
        },
      ]),
    ),
    portfolioValue,
    accPortfolioValue,
    benchmarkOneDayProfit: Object.values(BenchmarkIndex).reduce(
      (all, index) => {
        const benchmarkStock = { [index]: { volume: benchmarkVolume[index]?.volume || 0 } };

        return {
          ...all,
          [index]:
            getStocksValueCached(benchmarkStock, date, stockMarketData) -
            balance -
            (previousState.benchmarkStockValue[index] - previousState.balance),
        };
      },
      {} as Record<BenchmarkIndex, number>,
    ),
    benchmarkStock: Object.values(BenchmarkIndex).reduce(
      (all, indexTicker) => {
        return {
          ...all,
          [indexTicker]: {
            volume: benchmarkVolume[indexTicker]?.volume || 0,
            price: stockMarketData.get(indexTicker)?.tickerQuoteByDateString[dateKey] ?? undefined,
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
function getPortfolioValueData(
  portfolioEvents: PortfolioEvent[],
  stockMarketData: StockMarketDataMap,
): PortfolioValue[] {
  let cash = 0;
  let balance = 0;
  let totalCapitalInvested = 0;
  let profitOrLoss = 0;

  const stocks = {} as Record<string, Stock>;
  const eventsCopy = cloneDeep(portfolioEvents).toSorted(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  // Date range
  const startDate = addYears(new Date(), -3);
  const allDates = getDateRange(startDate, new Date());

  // For each date, find the portfolio state (cash, stocks) and fetch the close price
  const result: PortfolioValue[] = [];

  for (const day of allDates) {
    const dayEvents = [] as PortfolioEvent[];
    let event;

    if (eventsCopy.length > 0 && isSameDay(eventsCopy[0].date, day)) {
      event = eventsCopy.shift();
    }

    while (event) {
      dayEvents.push(event);
      if (eventsCopy.length > 0 && isSameDay(eventsCopy[0].date, day)) {
        event = eventsCopy.shift();
      } else {
        event = undefined;
      }
    }

    if (dayEvents.length === 0) {
      const previousState = result.at(-1);
      if (!previousState) {
        result.push({
          date: formatDate(day),
          cash: 0,
          balance: 0,
          totalCapitalInvested: 0,
          oneDayProfit: 0,
          accPortfolioValue: 0,
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
        if (event.type === CASH_EVENT) {
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
      if (dayEvents.some((e) => e.type === CASH_EVENT)) {
        const benchmarkPricesNotAvailable = Object.keys(benchmarkStockVolume).every(
          (indexTicker) => !stockMarketData.get(indexTicker)?.tickerQuoteByDateString[formatDate(day)],
        );
        if (benchmarkPricesNotAvailable) {
          continue;
        }

        Object.keys(benchmarkStockVolume).forEach((indexTicker) => {
          const benchmarkStockPrice =
            stockMarketData.get(indexTicker)?.tickerQuoteByDateString[formatDate(day)] || null;
          if (benchmarkStockPrice === null || benchmarkStockPrice.close == null) {
            console.warn(`No ${indexTicker} price for date: `, formatDate(day));
            return;
          }
          const depositBalance = dayEvents
            .filter(
              (e): e is PortfolioEvent & { type: typeof CASH_EVENT } =>
                e.type === CASH_EVENT && !!e.cashWithdrawalOrDeposit && e.cashWithdrawalOrDeposit > 0,
            )
            .reduce((acc, e) => acc + e.cashWithdrawalOrDeposit!, 0);

          benchmarkStockVolume[indexTicker as BenchmarkIndex].volume += depositBalance / benchmarkStockPrice.close;
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
  const allEvents = [...cashEvents, ...closedStocksCloseEvents];
  const portfolioTimeline = getPortfolioValueData(allEvents, new Map(Object.entries(portfolioData.stockMarketData)));

  const assetsAnalysis = getAssetsAnalysis(cashEvents, closedStocksOpenEvents, closedStocksCloseEvents);
  const cashFlow = getCashFlow(cashEvents);

  const riskMetrics = calculateRiskMetrics(portfolioTimeline);
  const riskMetricsByPeriod = {
    thirtyDays: calculateRiskMetrics(getTimelineWindow(portfolioTimeline, 30)),
    ninetyDays: calculateRiskMetrics(getTimelineWindow(portfolioTimeline, 90)),
    oneYear: calculateRiskMetrics(getTimelineWindow(portfolioTimeline, 365)),
  };

  return {
    assetsAnalysis,
    portfolioTimeline,
    stockMarketData: portfolioData.stockMarketData,
    cashFlow,
    riskMetrics,
    riskMetricsByPeriod,
  };
};
