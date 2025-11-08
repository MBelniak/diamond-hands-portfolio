import {
  type AssetsHistoricalData,
  CashEvent,
  CashFlow,
  PortfolioAnalysis,
  PortfolioData,
  PortfolioEvent,
  PortfolioValue,
  Stock,
  StocksHistoricalPrices,
} from "@/lib/xlsx-parser/types";
import { addYears, isSameDay } from "date-fns";
import { formatDate } from "../utils";
import { addDays } from "date-fns/addDays";
import { CASH, SP500, STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT, STOCK_OPEN_POSITION } from "@/lib/xlsx-parser/consts";
import { merge } from "lodash-es";
import { getDateRange } from "../xlsx-parser/utils";

function getStocksValueCached(stocks: Record<string, Stock>, date: Date, priceCache: StocksHistoricalPrices): number {
  let stocksValue = 0;
  const dateKey = date.toISOString().slice(0, 10);
  for (const symbol in stocks) {
    const closePrice = priceCache[symbol]?.price[dateKey] ?? null;
    if (closePrice !== null) {
      stocksValue += closePrice * stocks[symbol].volume;
    }
  }
  return stocksValue;
}

function getNextDayPortfolioValue(
  previousState: PortfolioValue,
  date: Date,
  prices: StocksHistoricalPrices,
): PortfolioValue {
  const dateKey = formatDate(date);

  return {
    date: formatDate(date),
    cash: previousState.cash,
    balance: previousState.balance,
    oneDayProfit:
      getStocksValueCached(previousState.stocks, date, prices) -
      getStocksValueCached(previousState.stocks, addDays(date, -1), prices),
    totalCapitalInvested: previousState.totalCapitalInvested,
    stocks: Object.fromEntries(
      Object.entries(previousState.stocks).map(([symbol, stock]) => [
        symbol,
        {
          ...stock,
          splitAdjustedPrice: prices[symbol]?.splitAdjustedPrice[dateKey],
          price: prices[symbol]?.price[dateKey],
        },
      ]),
    ),
    portfolioValue: previousState.cash + getStocksValueCached(previousState.stocks, date, prices),
    profitOrLoss: previousState.profitOrLoss,
    sp500Stock: {
      volume: previousState.sp500Stock.volume || 0,
      price: prices[SP500]?.price[dateKey],
    },
    sp500Value: getStocksValueCached({ [SP500]: { volume: previousState.sp500Stock.volume || 0 } }, date, prices),
  };
}

function getPortfolioValueOnEventDay(
  cash: number,
  balance: number,
  totalCapitalInvested: number,
  stocks: Record<string, Stock>,
  profitOrLoss: number,
  sp500Volume: number,
  date: Date,
  prices: StocksHistoricalPrices,
  previousState: PortfolioValue,
): PortfolioValue {
  const dateKey = formatDate(date);

  return {
    cash,
    balance,
    profitOrLoss,
    totalCapitalInvested,
    oneDayProfit:
      getStocksValueCached(previousState.stocks, date, prices) -
      getStocksValueCached(previousState.stocks, addDays(date, -1), prices),
    date: formatDate(date),
    stocks: Object.fromEntries(
      Object.entries(stocks).map(([symbol, stock]) => [
        symbol,
        {
          ...stock,
          splitAdjustedPrice: prices[symbol]?.splitAdjustedPrice[dateKey],
          price: prices[symbol]?.price[dateKey],
        },
      ]),
    ),
    portfolioValue: cash + getStocksValueCached(stocks, date, prices),
    sp500Stock: { volume: sp500Volume, price: prices[SP500]?.price[dateKey] ?? undefined },
    sp500Value: getStocksValueCached({ [SP500]: { volume: sp500Volume } }, date, prices),
  };
}

function getAssetsAnalysis(
  stockOpenPositions: PortfolioEvent[],
  stockClosedPositionsOpenEvents: PortfolioEvent[],
  stockCloseEvents: PortfolioEvent[],
  prices: StocksHistoricalPrices,
): AssetsHistoricalData {
  return stockOpenPositions
    .concat(stockClosedPositionsOpenEvents)
    .concat(stockCloseEvents)
    .reduce((acc, stockEvent) => {
      const dateKey = formatDate(new Date(stockEvent.date));
      const stockSymbol = "stockSymbol" in stockEvent ? stockEvent["stockSymbol"] : null;
      if (!stockSymbol) return acc;

      const eventStockPrice = prices[stockSymbol]?.splitAdjustedPrice[dateKey];

      if (!acc[stockSymbol]) {
        acc[stockSymbol] = {
          openPositions: [],
          closeEvents: [],
          openEvents: [],
        };
      }

      if (stockEvent.type === STOCK_OPEN_POSITION) {
        return merge(acc, {
          [stockSymbol]: {
            openPositions: [
              ...(acc[stockSymbol]?.openPositions || []),
              {
                date: formatDate(new Date(stockEvent.date)),
                volume: stockEvent.stocksVolumeChange,
                stockValueOnBuy: eventStockPrice ? stockEvent.stocksVolumeChange * eventStockPrice : undefined,
                profitOrLoss: stockEvent.profitOrLoss,
              },
            ],
          },
        });
      } else if (stockEvent.type === STOCK_OPEN_EVENT) {
        const stockSymbol = stockEvent.stockSymbol;
        if (!stockSymbol) return acc;

        return merge(acc, {
          [stockSymbol]: {
            openEvents: [
              ...(acc[stockSymbol]?.openEvents || []),
              {
                date: formatDate(new Date(stockEvent.date)),
                volume: stockEvent.stocksVolumeChange,
                stockValueOnBuy: eventStockPrice ? stockEvent.stocksVolumeChange * eventStockPrice : undefined,
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
                stockValueOnSell: eventStockPrice ? stockEvent.stocksVolumeChange * eventStockPrice : undefined,
                profitOrLoss: stockEvent.profitOrLoss,
              },
            ],
          },
        });
      }

      return acc;
    }, {} as AssetsHistoricalData);
}

/**
 * Main function: for each day fetches the close price and calculates the portfolio value
 */
function getPortfolioValueData(portfolioEvents: PortfolioEvent[], prices: StocksHistoricalPrices): PortfolioValue[] {
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
          stocks: {},
          portfolioValue: 0,
          profitOrLoss: 0,
          sp500Stock: { volume: 0 },
          sp500Value: 0,
        });
        continue;
      }

      result.push(getNextDayPortfolioValue(previousState, day, prices));
    } else {
      for (const event of dayEvents) {
        if (event.type === CASH) {
          cash += event.cashChange;
          if (event.cashWithdrawalOrDeposit) {
            balance += event.cashWithdrawalOrDeposit; // Update balance on withdrawal or deposit
            if (event.cashWithdrawalOrDeposit > 0) {
              totalCapitalInvested += event.cashWithdrawalOrDeposit; // Track total capital invested
            }
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
        } else if ([STOCK_OPEN_EVENT, STOCK_OPEN_POSITION].includes(event.type) && event.stockSymbol) {
          if (!(event.stockSymbol in stocks)) {
            stocks[event.stockSymbol] = { volume: 0 };
          }
          stocks[event.stockSymbol] = { volume: stocks[event.stockSymbol].volume + event.stocksVolumeChange };
        } else if (event.type === STOCK_CLOSE_EVENT && event.stockSymbol) {
          if (event.stockSymbol in stocks) {
            const stockRecord = stocks[event.stockSymbol];
            stocks[event.stockSymbol] = {
              volume: stockRecord.volume - event.stocksVolumeChange,
              takenProfitOrLoss: (stockRecord.takenProfitOrLoss ?? 0) + event.profitOrLoss,
            };
            if (stocks[event.stockSymbol].volume <= 1e-6) {
              stocks[event.stockSymbol].volume = 0;
            }
          }
          profitOrLoss += event.profitOrLoss || 0; // Add profit or loss from closed position
        }
      }

      let sp500Volume = result.at(-1)?.sp500Stock.volume || 0;
      if (dayEvents.some((e) => e.type === CASH)) {
        const sp500Price = prices[SP500]?.price[formatDate(day)] || null;
        if (sp500Price === null) {
          console.warn("No SP500 price for date: ", formatDate(day));
          continue;
        }
        const depositBalance = dayEvents
          .filter(
            (e): e is PortfolioEvent & { type: typeof CASH } =>
              e.type === CASH && !!e.cashWithdrawalOrDeposit && e.cashWithdrawalOrDeposit > 0,
          )
          .reduce((acc, e) => acc + e.cashWithdrawalOrDeposit!, 0);
        sp500Volume += depositBalance / sp500Price;
      }

      result.push(
        getPortfolioValueOnEventDay(
          cash,
          balance,
          totalCapitalInvested,
          stocks,
          profitOrLoss,
          sp500Volume,
          day,
          prices,
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
  const { cashEvents, openPositions, closedStocksOpenEvents, closedStocksCloseEvents } = portfolioData.portfolioEvents;

  const allEvents = [...cashEvents, ...openPositions, ...closedStocksOpenEvents, ...closedStocksCloseEvents].toSorted(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const portfolioTimeline = getPortfolioValueData(allEvents, portfolioData.stockPrices);

  const assetsAnalysis = getAssetsAnalysis(
    openPositions,
    closedStocksOpenEvents,
    closedStocksCloseEvents,
    portfolioData.stockPrices,
  );
  const cashFlow = getCashFlow(cashEvents);

  return {
    assetsAnalysis,
    portfolioTimeline,
    stockPrices: portfolioData.stockPrices,
    cashFlow,
  };
};
