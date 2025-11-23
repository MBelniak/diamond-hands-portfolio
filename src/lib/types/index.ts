import { CASH, STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT, STOCK_OPEN_POSITION } from "../xlsx-parser/consts";

export type Stock = {
  volume: number;
  stockVolumeSold?: number;
  takenProfitOrLoss?: number;
  price?: number;
  splitAdjustedPrice?: number;
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
  benchmarkOneDayProfit: number;
  benchmarkStock: Stock;
  benchmarkStockValue: number;
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

export type PortfolioEvent = {
  date: ISODateTimeString;
  type: typeof CASH | typeof STOCK_OPEN_POSITION | typeof STOCK_OPEN_EVENT | typeof STOCK_CLOSE_EVENT;
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

export type TickerMarketData = {
  currency: string;
  price: Record<ISODateString, number>; // date -> price
  splitAdjustedPrice: Record<ISODateString, number>; // date -> split adjusted price
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
