export type TransactionType = "buy" | "sell" | "deposit" | "withdrawal";

export interface TransactionRow {
  id: string;
  date: string; // ISO date-time string
  type: TransactionType;
  ticker: string | null;
  name: string | null;
  volume: number | null;
  price: number | null;
  amount: number; // cashChange
}
