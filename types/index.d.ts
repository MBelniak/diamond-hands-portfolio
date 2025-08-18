export type Stock = {
  volume: number;
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
  sp500Stock: Stock;
  sp500Value: number;
};
