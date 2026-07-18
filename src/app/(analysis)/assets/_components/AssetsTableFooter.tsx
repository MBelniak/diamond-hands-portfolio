"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { getProfitLossTextClass } from "./AssetsTable.columns";
import { cn } from "@/lib/utils";
import { AssetTableData } from "@/app/(analysis)/assets/_types";

interface AssetsTableFooterProps {
  columns: ColumnDef<AssetTableData, string | number>[];
  totals: Partial<AssetTableData>;
}

export function AssetsTableFooter({ columns, totals }: AssetsTableFooterProps) {
  return (
    <TableFooter>
      <TableRow className="font-bold">
        {columns.map((col) => {
          const colAny = col as unknown as { accessorKey: keyof AssetTableData; id?: string };
          const key = colAny.accessorKey;
          const value = totals[key];

          if (typeof value === "number") {
            if (key === "accProfitOrLoss" || key === "unrealizedProfitOrLoss" || key === "potentialValue") {
              const profitScale = totals.profitScale as number | undefined;
              const cls = getProfitLossTextClass(value as number, profitScale ?? 0);
              return (
                <TableCell key={key}>
                  <div className={cn(cls, "font-mono text-right")}>{value.toFixed(2)}</div>
                </TableCell>
              );
            }

            if (key === "marketValue") {
              const profit = totals.unrealizedProfitOrLoss ?? 0;
              const profitAsPercentage = (profit / ((totals.marketValue ?? 1) - profit)) * 100;
              const cls = getProfitLossTextClass(profit, totals.profitScale ?? 1);

              return (
                <TableCell key={key}>
                  <div className={"flex flex-col font-mono"}>
                    {value.toFixed(2)}
                    <div className={cn(cls, "text-xs")}>
                      {profit.toFixed(2) + (totals.marketValue ? ` (${profitAsPercentage.toFixed(2)}%)` : "")}
                    </div>
                  </div>
                </TableCell>
              );
            }

            return (
              <TableCell key={key}>
                <div className="font-mono">{value.toFixed(2)}</div>
              </TableCell>
            );
          }

          if (key === "assetSymbol") {
            return <TableCell key={key}>Total</TableCell>;
          }

          return (
            <TableCell key={key}>
              <div className="font-mono">{String(value ?? "")}</div>
            </TableCell>
          );
        })}
      </TableRow>
    </TableFooter>
  );
}
