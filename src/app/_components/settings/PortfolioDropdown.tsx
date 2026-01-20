"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { PortfolioCurrency } from "@/lib/types";

export const PortfolioDropdown = () => {
  const { selectedPortfolio, setSelectedPortfolio } = useStore();

  return (
    <div className={"grid grid-cols-2 gap-2 p-2 items-center w-full"}>
      <span className={"text-nowrap"}>Portfolio account:</span>
      <Select defaultValue={selectedPortfolio} onValueChange={setSelectedPortfolio}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(PortfolioCurrency).map((value) => {
            return (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
