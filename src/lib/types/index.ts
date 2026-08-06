import { CASH_EVENT, STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT, STOCK_OPEN_POSITION } from "../xlsx-parser/consts";
import { BenchmarkIndex } from "@/lib/benchmarks";

export type TickerQuote = {
  open?: number;
  high?: number;
  close?: number;
  low?: number;
  volume?: number;
  regularMarketPrice?: number; // Exists only for the last timestamp
};

export type Stock = {
  volume: number;
  stockVolumeSold?: number;
  takenProfitOrLoss?: number;
  tickerQuote?: TickerQuote;
  splitAdjustedTickerQuote?: TickerQuote;
};

export type ISODateString = string;
export type ISODateTimeString = string;
export type StockSymbol = string;
export type Currency = string;
export type ExchangeRates = Record<ISODateString, Record<Currency, number>>;

export type PortfolioValue = {
  date: ISODateString;
  cash: number;
  balance: number;
  totalCapitalInvested: number;
  stocks: Record<StockSymbol, Stock>;
  portfolioValue: number;
  accPortfolioValue: number;
  profitOrLoss: number;
  profitOrLossIfNotSelling?: number;
  oneDayProfit: number;
  benchmarkOneDayProfit: Record<BenchmarkIndex, number>;
  benchmarkStock: Record<BenchmarkIndex, Stock>;
  benchmarkStockValue: Record<BenchmarkIndex, number>;
};

export type ValueTimeline = {
  date: ISODateString;
  value: number;
}[];

export type TWRValueTimeline = {
  date: ISODateString;
  value: number;
  oneDayProfit: number;
  totalCapitalInvested: number;
}[];

export type Split = { effective_date: ISODateString; split_factor: number };

export const enum XlsxColumn {
  TIME = "Time",
  AMOUNT = "Amount",
  TYPE = "Type",
  POSITION_ID = "Position ID",
  CASH_OPERATION_ID = "ID",
  OPEN_TIME = "Open Time (UTC)",
  CLOSE_TIME = "Close Time (UTC)",
  VOLUME = "Volume",
  TICKER = "Ticker",
  GROSS_PL = "Gross Profit",
  OPEN_PRICE = "Open Price",
  CLOSE_PRICE = "Close Price",
  COMMENT = "Comment",
}

export type PortfolioEvent = {
  date: ISODateTimeString;
  type: typeof CASH_EVENT | typeof STOCK_OPEN_POSITION | typeof STOCK_OPEN_EVENT | typeof STOCK_CLOSE_EVENT;
  id: string;
} & (
  | {
      type: typeof CASH_EVENT;
      cashChange: number; // all cash operations
      cashWithdrawalOrDeposit: number | null; // only user-initiated deposits/withdrawals
      stocksVolumeChange?: number;
      stockSymbol?: string | null;
      openPrice?: number;
    }
  | ({
      stocksVolumeChange: number;
      stockSymbol: string | null;
    } & (
      | {
          type: typeof STOCK_OPEN_POSITION;
          profitOrLoss: number;
          openPrice: number;
        }
      | {
          type: typeof STOCK_CLOSE_EVENT;
          profitOrLoss: number;
          closePrice: number;
        }
      | {
          type: typeof STOCK_OPEN_EVENT;
          openPrice: number;
        }
    ))
);

export type CashEvent = PortfolioEvent & { type: typeof CASH_EVENT };

export type AssetsHistoricalData = {
  [stockSymbol: StockSymbol]: {
    openPositions: { volume: number; stockPriceOnBuy: number; date: ISODateString }[];
    openEvents: { volume: number; stockPriceOnBuy: number; date: ISODateString }[];
    closeEvents: { volume: number; stockPriceOnSell: number; profitOrLoss: number; date: ISODateString }[];
  };
};

export type TickerYahooResponse = {
  chart?: {
    result?: {
      timestamp?: number[];
      meta?: {
        currency: string;
        regularMarketPrice: number;
        longName: string;
        instrumentType?: string;
        currentTradingPeriod: { regular: { end: number } };
      };
      indicators?: {
        quote?: {
          open: number[];
          high: number[];
          close: number[];
          low: number[];
          volume: number[];
        }[];
      };
      events?: {
        splits?: Record<string, { date: number; numerator: number; denominator: number }>;
      };
    }[];
  };
};

export type TickerMarketData = {
  currency: string;
  tickerQuoteByDateString: Record<ISODateString, TickerQuote>; // date -> price
  splitAdjustedTickerQuoteByDateString: Record<ISODateString, TickerQuote>; // date -> split adjusted price
  regularMarketPrice: number;
  longName: string;
  instrumentType?: string;
  splits: Split[];
};

export type StockMarketData = Record<StockSymbol, TickerMarketData>; // symbol -> {price: <date(YYYY-MM-DD), value>, currency, splitAdjustedPrice: <date(YYYY-MM-DD), value>, longName: string}
export type StockMarketDataMap = Map<StockSymbol, TickerMarketData>; // symbol -> {price: <date(YYYY-MM-DD), value>, currency, splitAdjustedPrice: <date(YYYY-MM-DD), value>, longName: string}

export type CashFlow = { amount: number; date: ISODateString }[]; // date -> cash flow

export type RiskMetrics = {
  /** Annualized standard deviation of daily returns */
  volatility: number;
  /** Worst peak-to-trough decline as a fraction (e.g. -0.25 = -25%) */
  maxDrawdown: number;
  maxDrawdownPeakDate: ISODateString;
  maxDrawdownTroughDate: ISODateString;
  /** Risk-adjusted return: (annualReturn - riskFreeRate) / volatility */
  sharpeRatio: number;
  /** Like Sharpe but only penalises downside volatility */
  sortinoRatio: number;
  /** Portfolio sensitivity vs each benchmark index */
  beta: Record<BenchmarkIndex, number>;
  /** Historical Value at Risk at 95% confidence (daily return fraction) */
  var95: number;
};

export type PortfolioAnalysis = {
  assetsAnalysis: AssetsHistoricalData;
  portfolioTimeline: PortfolioValue[];
  stockMarketData: StockMarketData;
  cashFlow: CashFlow;
  riskMetrics: RiskMetrics;
  riskMetricsByPeriod: {
    thirtyDays: RiskMetrics;
    ninetyDays: RiskMetrics;
    oneYear: RiskMetrics;
  };
};

export type PortfolioEvents = {
  cashEvents: CashEvent[];
  openPositions: PortfolioEvent[];
  closedStocksOpenEvents: PortfolioEvent[];
  closedStocksCloseEvents: PortfolioEvent[];
};

export type PortfolioData = {
  stockMarketData: StockMarketData;
  portfolioEvents: PortfolioEvents;
};

export enum PortfolioCurrency {
  USD = "USD",
  EUR = "EUR",
}

export const PortfolioCurrencyToSymbol: Record<PortfolioCurrency, string> = {
  [PortfolioCurrency.USD]: "$",
  [PortfolioCurrency.EUR]: "€",
};
