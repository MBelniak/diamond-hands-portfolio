"use client";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";

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
