export type Asset = {
  assetSymbol: string;
  longName: string;
  accProfitOrLoss: number;
  potentialValue: number;
  unrealizedProfitOrLoss: number;
  volume: number;
  allocation: number;
  marketValue: number;
  instrumentType?: string;
};
