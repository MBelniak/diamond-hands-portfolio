"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Asset, AssetTableData } from "../_types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PortfolioCurrency, PortfolioCurrencyToSymbol } from "@/lib/types";

export function getProfitLossTextClass(value: number, maxAbs: number): string {
  if (maxAbs > 0) {
    const abs = Math.abs(value);
    const ratio = abs / maxAbs;
    if (ratio > 0.75) {
      return value > 0 ? "text-green-700 dark:text-green-500" : "text-red-600 dark:text-red-700";
    }
    if (ratio > 0.1) {
      return value > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-500";
    }
    return value > 0
      ? "text-green-500 dark:text-green-300"
      : value < 0
        ? "text-red-400 dark:text-red-400"
        : "text-gray-500 dark:text-gray-300";
  }

  return "text-gray-500 dark:text-gray-300";
}

export const getColumns = (currency: PortfolioCurrency): ColumnDef<AssetTableData>[] => [
  {
    accessorKey: "assetSymbol",
    header: "Asset",
    cell: (info) => {
      const symbol = info.getValue() as string;
      const fullName = info.row.original.longName;
      const instrumentType = info.row.original.instrumentType;
      return (
        <div className="max-w-40 flex gap-1 items-center justify-between">
          <div>
            <p className="font-medium">{symbol}</p>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap overflow-hidden text-ellipsis line-clamp-3">
              {fullName}
            </p>
          </div>
          <div>{instrumentType && <Badge variant="outline">{instrumentType}</Badge>}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "marketValue",
    header: `Market Value (${PortfolioCurrencyToSymbol[currency]})`,
    cell: (info) => {
      const marketValue = info.getValue() as number;
      const profit = info.row.original.unrealizedProfitOrLoss;
      const allocation = info.row.original.allocation ?? 0;
      const profitAsPercentage = info.row.original.unrealizedProfitOrLossPercentage;
      const cls = getProfitLossTextClass(profit, info.row.original.profitScale);

      return marketValue != null ? (
        <div className={"flex flex-col"}>
          {marketValue.toFixed(2) + (marketValue != 0 ? ` (${(allocation * 100).toFixed(2)}%)` : "")}
          {marketValue != 0 && (
            <div className={cn(cls, "text-xs")}>{`${profit.toFixed(2)} (${profitAsPercentage.toFixed(2)}%)`}</div>
          )}
        </div>
      ) : (
        "-"
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "volume",
    header: "Shares Owned",
    cell: (info) => {
      const v = info.getValue() as number;
      return v != null ? v.toFixed(2) : "-";
    },
    enableSorting: true,
  },
  {
    accessorKey: "accProfitOrLoss",
    header: `Acc. profit/loss (${PortfolioCurrencyToSymbol[currency]})`,
    cell: (info) => {
      const v = info.getValue() as number;
      const cls = getProfitLossTextClass(v, info.row.original.profitScale);
      return <div className={cls}>{v.toFixed(2)}</div>;
    },
    enableSorting: true,
  },
  {
    accessorKey: "potentialValue",
    header: `Potential Profit/Loss (${PortfolioCurrencyToSymbol[currency]})`,
    cell: (info) => {
      const v = info.getValue() as number;
      const cls = getProfitLossTextClass(v, info.row.original.profitScale);
      return <div className={cls}>{v.toFixed(2)}</div>;
    },
    enableSorting: true,
  },
];
