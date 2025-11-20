"use client";

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { getProfitLossTextClass } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totals?: Partial<TData> | null;
}

export function AssetsTable<TData, TValue>({ columns, data, totals }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          canSort ? "flex items-center space-x-2 cursor-pointer" : "flex items-center space-x-2"
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        <span className="text-sm">
                          {header.column.getIsSorted() === "asc"
                            ? " ▲"
                            : header.column.getIsSorted() === "desc"
                              ? " ▼"
                              : ""}
                        </span>
                      </div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const isTotal = (row.original as unknown as { isTotal?: boolean }).isTotal;
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={isTotal ? "bg-gray-100 dark:bg-slate-700/80 font-bold" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {totals ? (
          <TableFooter>
            <TableRow className="bg-gray-100 dark:bg-slate-700/80 font-bold">
              {columns.map((col, i) => {
                const colAny = col as unknown as { accessorKey?: string; id?: string };
                const key = colAny.accessorKey ?? colAny.id ?? String(i);
                const totalsTyped = totals as Record<string, unknown>;
                const value = totalsTyped[key];

                if (typeof value === "number") {
                  // For profit/loss fields, apply color scaling if profitScale exists
                  if (key === "accProfitOrLoss" || key === "unrealizedProfitOrLoss" || key === "potentialValue") {
                    const profitScale = totalsTyped.profitScale as number | undefined;
                    const cls = getProfitLossTextClass(value as number, profitScale ?? 0);
                    return (
                      <TableCell key={key}>
                        <div className={cls}>{value.toFixed(2)}</div>
                      </TableCell>
                    );
                  }

                  if (key === "marketValue") {
                    return <TableCell key={key}>{value.toFixed(2)}</TableCell>;
                  }

                  return <TableCell key={key}>{value.toFixed(2)}</TableCell>;
                }

                if (key === "assetSymbol") {
                  return <TableCell key={key}>Total</TableCell>;
                }

                return <TableCell key={key}>{String(value ?? "")}</TableCell>;
              })}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  );
}
