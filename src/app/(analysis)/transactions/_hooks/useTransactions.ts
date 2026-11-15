"use client";

import { useMemo } from "react";
import { CashEvent, StockMarketData } from "@/lib/types";
import { TransactionRow, TransactionType } from "@/app/(analysis)/transactions/_types";
import { getSplitFactor } from "@/lib/splits";

function classifyEvent(event: CashEvent): TransactionType | null {
  const hasStockChange = event.stocksVolumeChange !== undefined && event.stocksVolumeChange !== 0;
  if (hasStockChange) {
    return (event.stocksVolumeChange ?? 0) > 0 ? "buy" : "sell";
  }
  if (event.cashWithdrawalOrDeposit !== null && event.cashWithdrawalOrDeposit !== undefined) {
    return event.cashWithdrawalOrDeposit >= 0 ? "deposit" : "withdrawal";
  }
  return null;
}

export function useTransactions(cashEvents: CashEvent[], stockMarketData?: StockMarketData): TransactionRow[] {
  return useMemo(() => {
    const rows: TransactionRow[] = [];
    for (const event of cashEvents) {
      const type = classifyEvent(event);
      if (!type) continue;

      const ticker = event.stockSymbol ?? null;
      const tickerLongName = ticker ? (stockMarketData?.[ticker]?.longName ?? null) : null;
      // The price is split-adjusted, so show the volume split-adjusted too (volume × price = amount)
      const splitFactor = ticker ? getSplitFactor(stockMarketData?.[ticker]?.splits, event.date) : 1;
      rows.push({
        id: event.id,
        date: event.date,
        type,
        ticker,
        name: tickerLongName,
        volume: event.stocksVolumeChange ? Math.abs(event.stocksVolumeChange) * splitFactor : null,
        price: event.openPrice ?? null,
        amount: event.cashChange,
      });
    }
    // Chronological order (newest first)
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cashEvents, stockMarketData]);
}
