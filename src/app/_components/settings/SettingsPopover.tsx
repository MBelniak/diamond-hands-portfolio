"use client";
import React from "react";
import { PortfolioDropdown } from "@/app/_components/settings/PortfolioDropdown";
import { BenchmarkDropdown } from "@/app/_components/settings/BenchmarkDropdown";
import { ReturnMetricsSelector } from "@/app/_components/settings/ReturnMetricsSelector";
import { ChartTypeSelector } from "@/app/_components/settings/ChartTypeSelector";

export const SettingsPopover: React.FC<{ onRequestCloseAction: () => void }> = ({ onRequestCloseAction }) => {
  return (
    <div className={"flex flex-col gap-1 w-full"}>
      <BenchmarkDropdown />
      <PortfolioDropdown onRequestCloseAction={onRequestCloseAction} />
      <ReturnMetricsSelector />
      <ChartTypeSelector />
    </div>
  );
};
