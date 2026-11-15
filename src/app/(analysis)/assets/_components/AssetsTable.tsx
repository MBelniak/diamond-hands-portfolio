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

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssetsTableFooter } from "./AssetsTableFooter";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { AssetTableData } from "@/app/(analysis)/assets/_types";
import { Pagination } from "@/components/table/Pagination";

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
    <div className="bg-surface overflow-hidden border backdrop-blur-lg">
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
                        className={cn(
                          "flex items-center space-x-2",
                          canSort ? "cursor-pointer" : undefined,
                          (header.column.columnDef.meta as { align?: string } | undefined)?.align === "right"
                            ? "justify-end"
                            : undefined,
                        )}
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
                    isTotal ? "bg-muted font-medium" : undefined,
                    isLoading === row.id ? "opacity-50 cursor-progress" : undefined,
                    isLoading === false ? "cursor-pointer" : undefined,
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
        {totals ? <AssetsTableFooter columns={columns} totals={totals} /> : null}
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
