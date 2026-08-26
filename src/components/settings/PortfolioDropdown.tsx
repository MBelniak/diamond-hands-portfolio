"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { PortfolioCurrency } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import { isPathNested } from "@/lib/utils";

export const PortfolioDropdown: React.FC<{ onRequestCloseAction: () => void }> = ({ onRequestCloseAction }) => {
  const { selectedPortfolio, setSelectedPortfolio } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const onChangeSelectedPortfolio = (portfolio: PortfolioCurrency) => {
    if (portfolio !== selectedPortfolio) {
      setSelectedPortfolio(portfolio);
      onRequestCloseAction();
      if (isPathNested(pathname)) {
        router.replace(pathname.slice(0, pathname.slice(1).indexOf("/") + 1));
      }
    }
  };

  return (
    <div className={"grid grid-cols-2 gap-2 p-2 items-center w-full"}>
      <span className={"text-nowrap"}>Portfolio account:</span>
      <Select
        defaultValue={selectedPortfolio}
        onValueChange={(portfolio: PortfolioCurrency) => {
          onChangeSelectedPortfolio(portfolio);
        }}
      >
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
