"use client";
import React from "react";
import { PortfolioDropdown } from "@/components/settings/PortfolioDropdown";
import { BenchmarkDropdown } from "@/components/settings/BenchmarkDropdown";
import { ReturnMetricsSelector } from "@/components/settings/ReturnMetricsSelector";
import { ChartTypeSelector } from "@/components/settings/ChartTypeSelector";

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
