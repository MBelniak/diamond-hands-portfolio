"use client";

import React, { useMemo } from "react";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { ColumnDef, ColumnDefBase, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { cn, getProfitLossClass } from "@/lib/utils";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";
import { useStore } from "@/lib/store";
import { getReturnOnTimeline, ReturnMetricsOnBenchmark } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";
import { getCashFlowForBenchmarkComparison } from "@/lib/returnMetrics";

type BenchmarkRow = {
  benchmark: string;
} & ReturnMetricsOnBenchmark;

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

export const Benchmarks: React.FC = () => {
  const { data: portfolioAnalysis } = usePortfolioAnalysis();
  const { selectedReturnMetric } = useStore();

  const benchmarkData = useMemo(() => {
    if (!portfolioAnalysis?.portfolioTimeline || portfolioAnalysis.portfolioTimeline.length === 0) {
      return [];
    }

    const timeline = portfolioAnalysis.portfolioTimeline;
    const last = timeline.at(-1)!;
    const totalCapitalInvested = last.totalCapitalInvested;

    const portfolioTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
      ...el,
      value: el.portfolioValue,
      oneDayProfit: el.oneDayProfit,
    }));

    const benchmarkCashFlow = getCashFlowForBenchmarkComparison(portfolioAnalysis.cashFlow);

    const sp500Timeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
      ...el,
      value: el.benchmarkStockValue[BenchmarkIndex.SP_500],
      oneDayProfit: el.benchmarkOneDayProfit[BenchmarkIndex.SP_500],
    }));

    const nasdaqTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
      ...el,
      value: el.benchmarkStockValue[BenchmarkIndex.NASDAQ],
      oneDayProfit: el.benchmarkOneDayProfit[BenchmarkIndex.NASDAQ],
    }));

    const dowJonesTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
      ...el,
      value: el.benchmarkStockValue[BenchmarkIndex.DOW_JONES],
      oneDayProfit: el.benchmarkOneDayProfit[BenchmarkIndex.DOW_JONES],
    }));

    const nyseTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
      ...el,
      value: el.benchmarkStockValue[BenchmarkIndex.NYSE],
      oneDayProfit: el.benchmarkOneDayProfit[BenchmarkIndex.NYSE],
    }));

    const rows: BenchmarkRow[] = [
      {
        benchmark: "Portfolio",
        ...getReturnOnTimeline(
          portfolioTimeline,
          portfolioAnalysis.cashFlow,
          totalCapitalInvested,
          Object.values(TimePeriod),
          selectedReturnMetric,
        ),
      },
      {
        benchmark: BenchmarkIndexToName[BenchmarkIndex.SP_500],
        ...getReturnOnTimeline(
          sp500Timeline,
          benchmarkCashFlow,
          totalCapitalInvested,
          Object.values(TimePeriod),
          selectedReturnMetric,
        ),
      },
      {
        benchmark: BenchmarkIndexToName[BenchmarkIndex.NASDAQ],

        ...getReturnOnTimeline(
          nasdaqTimeline,
          benchmarkCashFlow,
          totalCapitalInvested,
          Object.values(TimePeriod),
          selectedReturnMetric,
        ),
      },
      {
        benchmark: BenchmarkIndexToName[BenchmarkIndex.DOW_JONES],
        ...getReturnOnTimeline(
          dowJonesTimeline,
          benchmarkCashFlow,
          totalCapitalInvested,
          Object.values(TimePeriod),
          selectedReturnMetric,
        ),
      },
      {
        benchmark: BenchmarkIndexToName[BenchmarkIndex.NYSE],
        ...getReturnOnTimeline(
          nyseTimeline,
          benchmarkCashFlow,
          totalCapitalInvested,
          Object.values(TimePeriod),
          selectedReturnMetric,
        ),
      },
    ];

    return rows;
  }, [portfolioAnalysis, selectedReturnMetric]);

  const columns = useMemo<
    ColumnDef<
      BenchmarkRow,
      | {
          return: number;
          totalProfit: number;
        }
      | string
    >[]
  >(
    () => [
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
    ],
    [],
  );

  const table = useReactTable({
    data: benchmarkData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!portfolioAnalysis) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Total Return vs Benchmarks</h2>
      </div>
      <Table className="w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
