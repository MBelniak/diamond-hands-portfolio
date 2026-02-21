"use client";

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProfitLossTextClass } from "./AssetsTable.columns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { AssetTableData } from "@/app/(analysis)/assets/_types";
import { Pagination } from "@/app/_components/table/Pagination";

type RowId = string;

interface AssetsDataTableProps {
  columns: ColumnDef<AssetTableData, string | number>[];
  data: AssetTableData[];
  totals: Partial<AssetTableData> | null;
}

export function AssetsTable({ columns, data, totals }: AssetsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 });
  const [isLoading, setIsLoading] = React.useState<false | RowId>(false);
  const router = useRouter();

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-xs border">
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
                  className={cn(
                    isTotal ? "bg-gray-100 dark:bg-slate-700/80 font-bold" : undefined,
                    isLoading === row.id ? "opacity-50 cursor-progress" : undefined,
                    isLoading === false ? "hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer" : undefined,
                  )}
                  onClick={() => {
                    if (isLoading === false) {
                      setIsLoading(row.id);
                      router.push("/assets/" + row.original.assetSymbol);
                    }
                  }}
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
              {columns.map((col) => {
                const colAny = col as unknown as { accessorKey: keyof AssetTableData; id?: string };
                const key = colAny.accessorKey;
                const totalsTyped = totals;
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
                    const profit = totals.unrealizedProfitOrLoss ?? 0;
                    const profitAsPercentage = (profit / ((totals.marketValue ?? 1) - profit)) * 100;
                    const cls = getProfitLossTextClass(profit, totals.profitScale ?? 1);

                    return (
                      <TableCell key={key}>
                        <div className={"flex flex-col"}>
                          {value.toFixed(2)}
                          <div className={cn(cls, "text-xs")}>
                            {profit.toFixed(2) + (totals.marketValue ? ` (${profitAsPercentage.toFixed(2)}%)` : "")}
                          </div>
                        </div>
                      </TableCell>
                    );
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

      <Pagination
        currentPage={table.getState().pagination.pageIndex}
        pageCount={table.getPageCount()}
        pageSize={15}
        onPageChange={(page) => table.setPageIndex(page)}
      />
    </div>
  );
}
