"use client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CogIcon } from "lucide-react";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BenchmarkIndex } from "@/lib/benchmarks";
import { useStore } from "@/lib/store";

export const SettingsDropdownMenu: React.FC = () => {
  const { selectedBenchmark, setSelectedBenchmark } = useStore();
  return (
    <Popover>
      <PopoverTrigger>
        <div
          className={
            "rounded-[50%] aspect-square w-9 flex items-center justify-center bg-white/10 hover:bg-white/20 cursor-pointer"
          }
        >
          <CogIcon />
        </div>
      </PopoverTrigger>
      <PopoverContent>
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
      </PopoverContent>
    </Popover>
  );
};
