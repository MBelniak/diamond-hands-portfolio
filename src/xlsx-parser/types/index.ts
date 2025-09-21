import { CASH, STOCK_CLOSE_EVENT, STOCK_OPEN_EVENT, STOCK_OPEN_POSITION } from "../consts";

export type Stock = {
  volume: number;
  stockVolumeSold?: number;
  takenProfitOrLoss?: number;
  price?: number;
};

export type PortfolioValue = {
  date: string;
  cash: number;
  balance: number;
  stocks: Record<string, Stock>;
  portfolioValue: number;
  profitOrLoss: number;
  profitOrLossIfNotSelling?: number;
  sp500Stock: Stock;
  sp500Value: number;
};

export type Split = { effective_date: string; split_factor: string };

export type PortfolioEvent = {
  date: Date;
  type: typeof CASH | typeof STOCK_OPEN_POSITION | typeof STOCK_OPEN_EVENT | typeof STOCK_CLOSE_EVENT;
} & (
  | {
      type: typeof CASH;
      cashChange: number;
      cashWithdrawalOrDeposit: number | null;
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

export type TimelineCheckpoint = {
  date: Date;
  cash: number;
  balance: number;
  stocks: Record<string, Stock>;
  profitOrLoss: number;
  cashWithdrawalOrDeposit: number | null;
};

export type AssetsHistoricalData = {
  [stockSymbol: string]: {
    openPositions: { volume: number; stockValueOnBuy: number; profitOrLoss: number; date: string }[];
    openEvents: { volume: number; stockValueOnBuy: number; date: string }[];
    closeEvents: { volume: number; stockValueOnSell: number; profitOrLoss: number; date: string }[];
    currentStockPrice: number | undefined;
  };
};

export type StockPricesRecord = Record<string, { currency: string; price: Record<string, number> }>; // symbol -> date(YYYY-MM-DD) -> {price, currency}

export type PortfolioAnalysis = {
  assetsAnalysis: AssetsHistoricalData;
  portfolioTimeline: PortfolioValue[];
};
