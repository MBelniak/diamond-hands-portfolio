import { ColumnDef, ColumnDefBase } from "@tanstack/react-table";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";
import { BenchmarkRow } from "@/app/(analysis)/performance/_components/Benchmarks/Benchmark.types";
import { cn, getProfitLossClass } from "@/lib/utils";
import React from "react";

const formatProfit = (value: number): string => {
  if (value === 0) return "0.00%";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const BenchmarkNumericCell: ColumnDefBase<
  BenchmarkRow,
  | {
      return: number;
      totalProfit: number;
    }
  | string
>["cell"] = (info) => {
  const value = (
    info.getValue() as {
      return: number;
      totalProfit: number;
    }
  ).return as number;
  return <div className={cn("text-left tabular-nums", getProfitLossClass(value))}>{formatProfit(value)}</div>;
};

export const benchmarkColumns: ColumnDef<
  BenchmarkRow,
  | {
      return: number;
      totalProfit: number;
    }
  | string
>[] = [
  {
    accessorKey: "benchmark",
    header: "Benchmark",
    cell: (info) => <div className="font-medium">{info.getValue() as string}</div>,
  },
  {
    accessorKey: TimePeriod.OneWeek,
    header: "1W",
    cell: BenchmarkNumericCell,
  },
  {
    accessorKey: TimePeriod.OneMonth,
    header: "1M",
    cell: BenchmarkNumericCell,
  },
  {
    accessorKey: TimePeriod.ThreeMonths,
    header: "3M",
    cell: BenchmarkNumericCell,
  },
  {
    accessorKey: TimePeriod.SixMonths,
    header: "6M",
    cell: BenchmarkNumericCell,
  },
  {
    accessorKey: TimePeriod.OneYear,
    header: "1Y",
    cell: BenchmarkNumericCell,
  },
  {
    accessorKey: TimePeriod.YearToDate,
    header: "YTD",
    cell: BenchmarkNumericCell,
  },
  {
    accessorKey: TimePeriod.All,
    header: "All Time",
    cell: BenchmarkNumericCell,
  },
];
