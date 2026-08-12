"use client";

import React, { useMemo } from "react";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";
import { useStore } from "@/lib/store";
import { getReturnOnTimeline } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";
import { getCashFlowForBenchmarkComparison } from "@/lib/returnMetrics";
import { BenchmarkRow } from "@/app/(analysis)/performance/_components/Benchmarks/Benchmark.types";
import { benchmarkColumns } from "@/app/(analysis)/performance/_components/Benchmarks/Banchmarks.columns";

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
      value: el.benchmarkData[BenchmarkIndex.SP_500].stockValue,
      oneDayProfit: el.benchmarkData[BenchmarkIndex.SP_500].oneDayProfit,
    }));

    const nasdaqTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
      ...el,
      value: el.benchmarkData[BenchmarkIndex.NASDAQ].stockValue,
      oneDayProfit: el.benchmarkData[BenchmarkIndex.NASDAQ].oneDayProfit,
    }));

    const dowJonesTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
      ...el,
      value: el.benchmarkData[BenchmarkIndex.DOW_JONES].stockValue,
      oneDayProfit: el.benchmarkData[BenchmarkIndex.DOW_JONES].oneDayProfit,
    }));

    const nyseTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
      ...el,
      value: el.benchmarkData[BenchmarkIndex.NYSE].stockValue,
      oneDayProfit: el.benchmarkData[BenchmarkIndex.NYSE].oneDayProfit,
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

  const columns = useMemo(() => benchmarkColumns, []);

  const table = useReactTable({
    data: benchmarkData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!portfolioAnalysis) {
    return null;
  }

  return (
    <div className="w-full space-y-4 relative">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Total Return vs Benchmarks</h2>
      </div>
      <Table className="w-full border">
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
