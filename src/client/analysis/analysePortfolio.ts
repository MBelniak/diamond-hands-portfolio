import {
  type AssetsHistoricalData,
  BenchmarkData,
  CashEvent,
  PortfolioAnalysis,
  PortfolioData,
  PortfolioEvent,
  PortfolioValue,
  Stock,
  StockMarketDataMap,
} from "@/lib/types";
import { isSameDay } from "date-fns";
import { formatDate } from "../../lib/utils";
import { addDays } from "date-fns/addDays";
import { CASH_EVENT, STOCK_CLOSE_EVENT } from "@/lib/xlsx-parser/consts";
import { cloneDeep } from "lodash-es";
import { getDateRange } from "../../lib/xlsx-parser/utils";
import { BenchmarkIndex } from "@/lib/benchmarks";
import { calculateRiskMetrics, getTimelineWindow } from "@/lib/riskMetrics";
import {
  buildAssetsEventHistory,
  deriveOpenPositionsFromCashEvents,
  getCashFlow,
  getDailyReturn,
  getInitialPortfolioState,
  initialBenchmarkData,
} from "./analysisUtil";

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

function getStocksWithLatestQuotes(
  stocks: Record<string, Stock>,
  date: Date,
  stockMarketData: StockMarketDataMap,
): Record<string, Stock> {
  const dateKey = formatDate(date);

  return Object.fromEntries(
    Object.entries(stocks).map(([symbol, stock]) => [
      symbol,
      {
        ...stock,
        splitAdjustedTickerQuote: stockMarketData.get(symbol)?.splitAdjustedTickerQuoteByDateString[dateKey],
        tickerQuote: stockMarketData.get(symbol)?.tickerQuoteByDateString[dateKey],
      },
    ]),
  );
}

function getEventsOnDay(eventsCopy: PortfolioEvent[], day: Date): PortfolioEvent[] {
  const dayEvents: PortfolioEvent[] = [];
  let event = eventsCopy.length > 0 && isSameDay(eventsCopy[0].date, day) ? eventsCopy.shift() : undefined;

  while (event) {
    dayEvents.push(event);
    event = eventsCopy.length > 0 && isSameDay(eventsCopy[0].date, day) ? eventsCopy.shift() : undefined;
  }

  return dayEvents;
}

function applyCashEvent(
  event: PortfolioEvent & { type: typeof CASH_EVENT },
  portfolioState: {
    cash: number;
    balance: number;
    totalCapitalInvested: number;
    stocks: Record<string, Stock>;
  },
): void {
  portfolioState.cash += event.cashChange;
  if (event.cashWithdrawalOrDeposit) {
    portfolioState.balance += event.cashWithdrawalOrDeposit;
    if (event.cashWithdrawalOrDeposit > 0) {
      portfolioState.totalCapitalInvested += event.cashWithdrawalOrDeposit;
    }
  }

  if (event.stockSymbol && event.stocksVolumeChange) {
    if (!(event.stockSymbol in portfolioState.stocks)) {
      portfolioState.stocks[event.stockSymbol] = { volume: 0 };
    }

    const newVolume = portfolioState.stocks[event.stockSymbol].volume + event.stocksVolumeChange;
    portfolioState.stocks[event.stockSymbol] = {
      ...portfolioState.stocks[event.stockSymbol],
      volume: newVolume <= 1e-6 ? 0 : Math.max(0, newVolume),
    };
  }
}

function applyStockCloseEvent(
  event: PortfolioEvent & { type: typeof STOCK_CLOSE_EVENT },
  stocks: Record<string, Stock>,
) {
  if (!event.stockSymbol) {
    return;
  }

  if (event.stockSymbol in stocks) {
    stocks[event.stockSymbol] = {
      ...stocks[event.stockSymbol],
      takenProfitOrLoss: (stocks[event.stockSymbol].takenProfitOrLoss ?? 0) + event.profitOrLoss,
    };
  }
}

function updateBenchmarkDataForCashEvents(
  dayEvents: PortfolioEvent[],
  currentBenchmarkData: Record<BenchmarkIndex, BenchmarkData>,
  day: Date,
  stockMarketData: StockMarketDataMap,
): void {
  const dateKey = formatDate(day);
  const benchmarkPricesNotAvailable = Object.values(BenchmarkIndex).every(
    (indexTicker) => !stockMarketData.get(indexTicker)?.tickerQuoteByDateString[dateKey],
  );

  if (benchmarkPricesNotAvailable) {
    return;
  }

  const depositBalance = dayEvents
    .filter(
      (e): e is PortfolioEvent & { type: typeof CASH_EVENT } =>
        e.type === CASH_EVENT && !!e.cashWithdrawalOrDeposit && e.cashWithdrawalOrDeposit > 0,
    )
    .reduce((acc, e) => acc + e.cashWithdrawalOrDeposit!, 0);

  Object.values(BenchmarkIndex).forEach((indexTicker) => {
    const benchmarkStockPrice = stockMarketData.get(indexTicker)?.tickerQuoteByDateString[dateKey] || null;
    if (benchmarkStockPrice === null || benchmarkStockPrice.close == null) {
      console.warn(`No ${indexTicker} price for date: `, dateKey);
      return;
    }

    currentBenchmarkData[indexTicker as BenchmarkIndex].stock.volume += depositBalance / benchmarkStockPrice.close;
  });
}

function getBenchmarkDataForDate(
  date: Date,
  stockMarketData: StockMarketDataMap,
  previousState?: PortfolioValue,
  currentBenchmarkStockData?: Record<BenchmarkIndex, BenchmarkData>, // Provided if different than in previousState
): Record<BenchmarkIndex, { stock: Stock; stockValue: number; oneDayProfit: number; dailyReturn: number }> {
  const dateKey = formatDate(date);

  return Object.values(BenchmarkIndex).reduce(
    (all, index) => {
      const volume =
        currentBenchmarkStockData?.[index].stock.volume ?? (previousState?.benchmarkData[index].stock.volume || 0);
      const benchmarkStock = { [index]: { volume } };
      const todaysValue = getStocksValueCached(benchmarkStock, date, stockMarketData);
      const previousValue = getStocksValueCached(benchmarkStock, addDays(date, -1), stockMarketData);

      return {
        ...all,
        [index]: {
          stock: {
            volume,
            price: stockMarketData.get(index)?.tickerQuoteByDateString[dateKey],
          },
          stockValue: todaysValue,
          oneDayProfit: todaysValue - previousValue,
          dailyReturn: previousValue === 0 ? 0 : todaysValue / previousValue - 1,
        },
      };
    },
    {} as Record<BenchmarkIndex, BenchmarkData>,
  );
}

function getNextDayPortfolioValue(
  previousState: PortfolioValue,
  date: Date,
  stockMarketData: StockMarketDataMap,
): PortfolioValue {
  const portfolioValue = previousState.cash + getStocksValueCached(previousState.stocks, date, stockMarketData);
  const accPortfolioValue = portfolioValue + (previousState.totalCapitalInvested - previousState.balance);
  const oneDayProfit = portfolioValue - previousState.portfolioValue;
  const profitOrLoss = portfolioValue - previousState.balance;

  return {
    date: formatDate(date),
    cash: previousState.cash,
    balance: previousState.balance,
    oneDayProfit,
    dailyReturn: getDailyReturn(previousState.accPortfolioValue, {
      oneDayProfit,
      date,
    }),
    totalCapitalInvested: previousState.totalCapitalInvested,
    stocks: getStocksWithLatestQuotes(previousState.stocks, date, stockMarketData),
    portfolioValue,
    accPortfolioValue,
    profit: Math.max(profitOrLoss, 0),
    loss: Math.min(profitOrLoss, 0),
    profitOrLoss,
    realizedProfitOrLoss: previousState.realizedProfitOrLoss,
    benchmarkData: getBenchmarkDataForDate(date, stockMarketData, previousState),
  };
}

function getPortfolioValueOnEventDay(
  {
    cash,
    balance,
    totalCapitalInvested,
    stocks,
  }: Pick<PortfolioValue, "cash" | "balance" | "totalCapitalInvested" | "stocks">,
  realizedProfitOrLoss: number,
  currentBenchmarkData: Record<BenchmarkIndex, BenchmarkData>,
  date: Date,
  stockMarketData: StockMarketDataMap,
  previousState?: PortfolioValue,
): PortfolioValue {
  const portfolioValue = cash + getStocksValueCached(stocks, date, stockMarketData);
  const accPortfolioValue = portfolioValue + (totalCapitalInvested - balance);
  const oneDayProfit = previousState
    ? portfolioValue - balance - (previousState.portfolioValue - previousState.balance)
    : 0;
  const profitOrLoss = portfolioValue - balance;

  return {
    cash: cash >= 0 ? cash : 0,
    balance,
    profit: Math.max(profitOrLoss, 0),
    loss: Math.min(profitOrLoss, 0),
    profitOrLoss,
    realizedProfitOrLoss,
    totalCapitalInvested,
    oneDayProfit,
    dailyReturn: previousState
      ? getDailyReturn(previousState.accPortfolioValue, {
          oneDayProfit,
          date,
        })
      : 0,
    date: formatDate(date),
    stocks: getStocksWithLatestQuotes(stocks, date, stockMarketData),
    portfolioValue,
    accPortfolioValue,
    benchmarkData: getBenchmarkDataForDate(date, stockMarketData, previousState, currentBenchmarkData),
  };
}

function getAssetsAnalysis(
  cashEvents: CashEvent[],
  stockClosedPositionsOpenEvents: PortfolioEvent[],
  stockCloseEvents: PortfolioEvent[],
): AssetsHistoricalData {
  const assetsHistoricalData = buildAssetsEventHistory(stockClosedPositionsOpenEvents, stockCloseEvents);
  const openPositionsBySymbol = deriveOpenPositionsFromCashEvents(cashEvents);

  for (const [symbol, openPositions] of Object.entries(openPositionsBySymbol)) {
    if (!assetsHistoricalData[symbol]) {
      assetsHistoricalData[symbol] = { openPositions: [], closeEvents: [], openEvents: [] };
    }
    assetsHistoricalData[symbol].openPositions = openPositions;
  }

  return assetsHistoricalData;
}

/**
 * Main function: for each day fetches the close price and calculates the portfolio value
 */
function getPortfolioValueData(
  portfolioEvents: PortfolioEvent[],
  stockMarketData: StockMarketDataMap,
): PortfolioValue[] {
  if (portfolioEvents.length === 0) {
    return [];
  }

  let cash = 0;
  let balance = 0;
  let totalCapitalInvested = 0;
  let realizedProfitOrLoss = 0;

  const stocks = {} as Record<string, Stock>;
  const eventsCopy = cloneDeep(portfolioEvents).toSorted(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Date range
  const startDate = addDays(new Date(eventsCopy[0].date), -3);
  const allDates = getDateRange(startDate, new Date());

  // For each date, find the portfolio state (cash, stocks) and fetch the close price
  const result: PortfolioValue[] = [];

  for (const day of allDates) {
    const dayEvents = getEventsOnDay(eventsCopy, day);

    if (dayEvents.length === 0) {
      const previousState = result.at(-1);
      if (!previousState) {
        result.push(getInitialPortfolioState(day));
        continue;
      }

      result.push(getNextDayPortfolioValue(previousState, day, stockMarketData));
    } else {
      const portfolioState: Pick<PortfolioValue, "cash" | "balance" | "totalCapitalInvested" | "stocks"> = {
        cash,
        balance,
        totalCapitalInvested,
        stocks,
      };

      for (const event of dayEvents) {
        if (event.type === CASH_EVENT) {
          applyCashEvent(event, portfolioState);
        } else if (event.type === STOCK_CLOSE_EVENT && event.stockSymbol) {
          applyStockCloseEvent(event, portfolioState.stocks);
          realizedProfitOrLoss += event.profitOrLoss || 0;
        }
      }

      cash = portfolioState.cash;
      balance = portfolioState.balance;
      totalCapitalInvested = portfolioState.totalCapitalInvested;

      const currentBenchmarkData = result.at(-1)?.benchmarkData ?? initialBenchmarkData;
      if (dayEvents.some((e) => e.type === CASH_EVENT)) {
        updateBenchmarkDataForCashEvents(dayEvents, currentBenchmarkData, day, stockMarketData);
      }

      result.push(
        getPortfolioValueOnEventDay(
          portfolioState,
          realizedProfitOrLoss,
          currentBenchmarkData,
          day,
          stockMarketData,
          result.at(-1),
        ),
      );
    }
  }

  return result;
}

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
