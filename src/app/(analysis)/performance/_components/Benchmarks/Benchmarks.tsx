"use client";

import React, { useMemo } from "react";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";
import { useStore } from "@/lib/store";
import { getReturnOnTimeline } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";
import { getCashFlowForBenchmarkComparison } from "@/lib/returnMetrics";
import { CashFlow } from "@/lib/types";
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
    const totalCapitalInvested = timeline.at(-1)!.totalCapitalInvested;
    const benchmarkCashFlow = getCashFlowForBenchmarkComparison(portfolioAnalysis.cashFlow);
    const getReturns = (valueTimeline: Parameters<typeof getReturnOnTimeline>[0], cashFlow: CashFlow) =>
      getReturnOnTimeline(
        valueTimeline,
        cashFlow,
        totalCapitalInvested,
        Object.values(TimePeriod),
        selectedReturnMetric,
      );

    const rows: BenchmarkRow[] = [
      {
        benchmark: "Portfolio",
        ...getReturns(
          timeline.map((el) => ({ ...el, value: el.portfolioValue })),
          portfolioAnalysis.cashFlow,
        ),
      },
      ...Object.values(BenchmarkIndex).map((index) => ({
        benchmark: BenchmarkIndexToName[index],
        ...getReturns(
          timeline.map((el) => ({
            ...el,
            value: el.benchmarkData[index].stockValue,
            oneDayProfit: el.benchmarkData[index].oneDayProfit,
          })),
          benchmarkCashFlow,
        ),
      })),
    ];

    return rows;
  }, [portfolioAnalysis, selectedReturnMetric]);

  const table = useReactTable({
    data: benchmarkData,
    columns: benchmarkColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!portfolioAnalysis) {
    return null;
  }

  return (
    <Card>
      <CardHeader title="Total return vs benchmarks" description="Portfolio return compared with major indices" />
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
    </Card>
  );
};
