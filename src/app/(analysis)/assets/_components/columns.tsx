"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Asset } from "../_types";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function getProfitLossTextClass(value: number, maxAbs: number): string {
  if (maxAbs > 0) {
    const abs = Math.abs(value);
    const ratio = abs / maxAbs;
    if (ratio > 0.75) {
      return value > 0
        ? "text-green-700 dark:text-green-500 font-extrabold text-lg"
        : "text-red-600 dark:text-red-700 font-extrabold text-lg";
    }
    if (ratio > 0.1) {
      return value > 0
        ? "text-green-600 dark:text-green-400 font-bold text-lg"
        : "text-red-500 dark:text-red-500 font-bold text-lg";
    }
    return value > 0
      ? "text-green-500 dark:text-green-300 font-semibold text-lg"
      : value < 0
        ? "text-red-400 dark:text-red-400 font-semibold text-lg"
        : "text-gray-500 dark:text-gray-300 font-semibold text-lg";
  }

  return "text-gray-500 dark:text-gray-300 font-semibold text-lg";
}

const ActionCell: React.FC<{ symbol: string }> = ({ symbol }) => {
  const router = useRouter();
  return (
    <Button variant={"secondary"} onClick={() => router.push("/assets/" + symbol)} size="icon">
      <TrendingUp />
    </Button>
  );
};

export const columns: ColumnDef<Asset & { profitScale: number }>[] = [
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
    accessorKey: "volume",
    header: "Shares Owned",
    cell: (info) => {
      const v = info.getValue() as number;
      return v != null ? v.toFixed(2) : "-";
    },
    enableSorting: true,
  },
  {
    accessorKey: "marketValue",
    header: "Market Value",
    cell: (info) => {
      const v = info.getValue() as number;
      const allocation = info.row.original.allocation ?? 0;
      return v != null ? `${v.toFixed(2)} (${(allocation * 100).toFixed(2)}%)` : "-";
    },
    enableSorting: true,
  },
  {
    accessorKey: "accProfitOrLoss",
    header: "Acc. profit/loss ($)",
    cell: (info) => {
      const v = info.getValue() as number;
      const cls = getProfitLossTextClass(v, info.row.original.profitScale);
      return <div className={cls}>{v.toFixed(2)}</div>;
    },
    enableSorting: true,
  },
  {
    accessorKey: "unrealizedProfitOrLoss",
    header: "Unrealized Profit/Loss ($)",
    cell: (info) => {
      const v = info.getValue() as number;
      const cls = getProfitLossTextClass(v, info.row.original.profitScale);
      return <div className={cls}>{v.toFixed(2)}</div>;
    },
    enableSorting: true,
  },
  {
    accessorKey: "potentialValue",
    header: "Potential Profit/Loss ($)",
    cell: (info) => {
      const v = info.getValue() as number;
      const cls = getProfitLossTextClass(v, info.row.original.profitScale);
      return <div className={cls}>{v.toFixed(2)}</div>;
    },
    enableSorting: true,
  },
  {
    id: "actions",
    header: "",
    cell: (info) => <ActionCell symbol={info.row.original.assetSymbol} />,
  },
];
