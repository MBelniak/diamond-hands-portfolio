import { CASH, STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT, STOCK_OPEN_POSITION } from "../xlsx-parser/consts";
import { BenchmarkIndex } from "@/lib/benchmarks";

export type TickerQuote = {
  open?: number;
  high?: number;
  close?: number;
  low?: number;
  volume?: number;
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

export enum XlsxColumn {
  TIME = "Time",
  AMOUNT = "Amount",
  TYPE = "Type",
  POSITION_ID = "Position ID",
  CASH_OPERATION_ID = "ID",
  OPEN_TIME = "Open time (UTC)",
  CLOSE_TIME = "Close time (UTC)",
  VOLUME = "Volume",
  SYMBOL = "Ticker",
  GROSS_PL = "Gross Profit",
  OPEN_PRICE = "Open price",
  CLOSE_PRICE = "Close price",
}

export type PortfolioEvent = {
  date: ISODateTimeString;
  type: typeof CASH | typeof STOCK_OPEN_POSITION | typeof STOCK_OPEN_EVENT | typeof STOCK_CLOSE_EVENT;
  id: string;
} & (
  | {
      type: typeof CASH;
      cashChange: number; // all cash operations
      cashWithdrawalOrDeposit: number | null; // only user-initiated deposits/withdrawals
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

export type CashEvent = PortfolioEvent & { type: typeof CASH };

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

export type CashFlow = { amount: number; date: ISODateString }[]; // date -> cash flow

export type PortfolioAnalysis = {
  assetsAnalysis: AssetsHistoricalData;
  portfolioTimeline: PortfolioValue[];
  stockMarketData: StockMarketData;
  cashFlow: CashFlow;
};

export type PortfolioData = {
  stockMarketData: StockMarketData;
  portfolioEvents: {
    cashEvents: CashEvent[];
    openPositions: PortfolioEvent[];
    closedStocksOpenEvents: PortfolioEvent[];
    closedStocksCloseEvents: PortfolioEvent[];
  };
};

export enum PortfolioCurrency {
  USD = "USD",
  EUR = "EUR",
}

export const PortfolioCurrencyToSymbol: Record<PortfolioCurrency, string> = {
  [PortfolioCurrency.USD]: "$",
  [PortfolioCurrency.EUR]: "€",
};
