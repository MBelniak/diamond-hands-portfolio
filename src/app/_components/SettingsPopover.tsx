"use client";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { BenchmarkIndex } from "@/lib/benchmarks";

export const SettingsPopover: React.FC = () => {
  const { selectedBenchmark, setSelectedBenchmark } = useStore();

  return (
    <div className={"flex gap-2 p-2 items-center"}>
      <span className={"text-nowrap"}>Comparison index:</span>
      <Select defaultValue={selectedBenchmark} onValueChange={setSelectedBenchmark}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={BenchmarkIndex.SP_500}>S&P 500</SelectItem>
          <SelectItem value={BenchmarkIndex.NASDAQ}>Nasdaq</SelectItem>
          <SelectItem value={BenchmarkIndex.DOW_JONES}>Dow Jones</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
