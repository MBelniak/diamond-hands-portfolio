"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";

export const BenchmarkDropdown = () => {
  const { selectedBenchmark, setSelectedBenchmark } = useStore();

  return (
    <div className={"flex p-2 items-center gap-2 justify-between w-full"}>
      <span className={"text-nowrap"}>Comparison index:</span>
      <Select defaultValue={selectedBenchmark} onValueChange={setSelectedBenchmark}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(BenchmarkIndex).map((value) => {
            return (
              <SelectItem key={value} value={value}>
                {BenchmarkIndexToName[value]}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
