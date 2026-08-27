import React from "react";
import { PortfolioDropdown } from "@/components/settings/PortfolioDropdown";
import { BenchmarkDropdown } from "@/components/settings/BenchmarkDropdown";
import { ReturnMetricsSelector } from "@/components/settings/ReturnMetricsSelector";
import { ChartTypeSelector } from "@/components/settings/ChartTypeSelector";

export const SettingsPopover: React.FC<{ onRequestClose: () => void }> = ({ onRequestClose }) => {
  return (
    <div className={"flex flex-col gap-1 w-full"}>
      <BenchmarkDropdown />
      <PortfolioDropdown onRequestCloseAction={onRequestClose} />
      <ReturnMetricsSelector />
      <ChartTypeSelector />
    </div>
  );
};
