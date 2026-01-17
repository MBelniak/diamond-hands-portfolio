"use client";
import React from "react";
import { PortfolioDropdown } from "@/app/_components/settings/PortfolioDropdown";
import { BenchmarkDropdown } from "@/app/_components/settings/BenchmarkDropdown";

export const SettingsPopover: React.FC = () => {
  return (
    <div className={"flex flex-col gap-1 w-full"}>
      <BenchmarkDropdown />
      <PortfolioDropdown />
    </div>
  );
};
