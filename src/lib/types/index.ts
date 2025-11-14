import { CASH, STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT, STOCK_OPEN_POSITION } from "../xlsx-parser/consts";

export type Stock = {
  volume: number;
  stockVolumeSold?: number;
  takenProfitOrLoss?: number;
  price?: number;
  splitAdjustedPrice?: number;
};

export type ISODateString = string;
export type StockSymbol = string;

export type PortfolioValue = {
  date: ISODateString;
  cash: number;
  balance: number;
  totalCapitalInvested: number;
  stocks: Record<string, Stock>;
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

export type Split = { effective_date: ISODateString; split_factor: string };

export type PortfolioEvent = {
  date: ISODateString;
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
          type: typeof STOCK_CLOSE_EVENT | typeof STOCK_OPEN_POSITION;
          profitOrLoss: number;
        }
      | {
          type: typeof STOCK_OPEN_EVENT;
        }
    ))
);

export type CashEvent = PortfolioEvent & { type: typeof CASH };

export type AssetsHistoricalData = {
  [stockSymbol: string]: {
    openPositions: { volume: number; stockPriceOnBuy: number; profitOrLoss: number; date: ISODateString }[];
    openEvents: { volume: number; stockPriceOnBuy: number; date: ISODateString }[];
    closeEvents: { volume: number; stockPriceOnSell: number; profitOrLoss: number; date: ISODateString }[];
  };
};

export type StockPricesRecord = {
  currency: string;
  price: Record<ISODateString, number>; // date -> price
  splitAdjustedPrice: Record<ISODateString, number>; // date -> split adjusted price
};

export type TickerMetadata = {
  name: string;
  ticker: string;
};

export type StocksHistoricalPrices = Record<StockSymbol, StockPricesRecord>; // symbol -> {price: <date(YYYY-MM-DD), value>, currency, splitAdjustedPrice: <date(YYYY-MM-DD), value>}
export type CashFlow = { amount: number; date: ISODateString }[]; // date -> cash flow
export type StocksMetadata = Record<StockSymbol, { symbol: StockSymbol; fullName: string | null }>;

export type PortfolioAnalysis = {
  assetsAnalysis: AssetsHistoricalData;
  portfolioTimeline: PortfolioValue[];
  stockPrices: StocksHistoricalPrices;
  stocksMetadata: StocksMetadata;
  cashFlow: CashFlow;
};

export type PortfolioData = {
  stockPrices: StocksHistoricalPrices;
  stocksMetadata: StocksMetadata;
  portfolioEvents: {
    cashEvents: CashEvent[];
    openPositions: PortfolioEvent[];
    closedStocksOpenEvents: PortfolioEvent[];
    closedStocksCloseEvents: PortfolioEvent[];
  };
};
