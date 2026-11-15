"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { TransactionRow, TransactionType } from "@/app/(analysis)/transactions/_types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { CompanyLogo } from "@/components/ui/company-logo";
import { useStore } from "@/lib/store";
import { PortfolioCurrencyToSymbol } from "@/lib/types";

const TYPE_LABELS: Record<TransactionType, string> = {
  buy: "Buy",
  sell: "Sell",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
};

const TYPE_BADGE_CLASS: Record<TransactionType, string> = {
  buy: "border-green-600/60 text-green-700 dark:border-green-400/50 dark:text-green-400",
  sell: "border-red-600/60 text-red-700 dark:border-red-400/50 dark:text-red-400",
  deposit: "border-blue-600/60 text-blue-700 dark:border-blue-400/50 dark:text-blue-400",
  withdrawal: "border-orange-600/60 text-orange-700 dark:border-orange-400/50 dark:text-orange-400",
};

export const transactionColumns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: (info) => (
      <span className="whitespace-nowrap text-sm text-muted-foreground figure">
        {format(new Date(info.getValue() as string), "yyyy-MM-dd HH:mm")}
      </span>
    ),
    sortingFn: "alphanumeric",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: (info) => {
      const type = info.getValue() as TransactionType;
      return (
        <span
          className={cn(
            "inline-flex items-center border bg-transparent px-2 py-0.5 text-xs font-medium",
            TYPE_BADGE_CLASS[type],
          )}
        >
          {TYPE_LABELS[type]}
        </span>
      );
    },
  },
  {
    accessorKey: "ticker",
    header: "Ticker",
    cell: function TickerCell(info) {
      const router = useRouter();
      const ticker = info.getValue() as string | null;

      if (!ticker) return <span className="text-muted-foreground">—</span>;

      const name = info.row.original.name;
      const badge = (
        <Badge variant="outline" className="text-xs">
          <span role={"button"} className={"cursor-pointer"} onClick={() => router.push(`/assets/${ticker}`)}>
            {ticker}
          </span>
        </Badge>
      );
      const tickerWithLogo = (
        <div className="inline-flex items-center gap-2">
          <CompanyLogo ticker={ticker} />
          {badge}
        </div>
      );
      if (!name) return tickerWithLogo;
      return (
        <Tooltip>
          <TooltipTrigger asChild>{tickerWithLogo}</TooltipTrigger>
          <TooltipContent>{name}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "volume",
    header: () => <div className="text-right">Volume</div>,
    meta: { align: "right" },
    cell: (info) => {
      const v = info.getValue() as number | null;
      return (
        <div className="text-right figure text-sm">
          {v !== null ? v.toFixed(4) : <span className="text-muted-foreground">—</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Price</div>,
    meta: { align: "right" },
    cell: (info) => {
      const v = info.getValue() as number | null;
      return (
        <div className="text-right figure text-sm">
          {v !== null && v !== 0 ? v.toFixed(2) : <span className="text-muted-foreground">—</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: function Header() {
      const { selectedPortfolio } = useStore();
      return <div className="text-right">Amount ({PortfolioCurrencyToSymbol[selectedPortfolio]})</div>;
    },
    meta: { align: "right" },
    cell: (info) => {
      const v = info.getValue() as number;
      return (
        <div
          className={cn(
            "text-right figure text-sm",
            v > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
          )}
        >
          {v > 0 ? "+" : ""}
          {v.toFixed(2)}
        </div>
      );
    },
  },
];
