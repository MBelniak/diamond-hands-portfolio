import React from "react";
import { PortfolioAnalysis, PortfolioCurrencyToSymbol } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatLabel, StatValue } from "./KeyFigure";

export const PortfolioCapitalSummary: React.FC<{
  portfolioAnalysis: PortfolioAnalysis;
}> = ({ portfolioAnalysis }) => {
  const { useWithdrawnCash, setUseWithdrawnCash, selectedPortfolio } = useStore();
  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  if (!portfolioTimeline.length) {
    return null;
  }
  const currencySymbol = PortfolioCurrencyToSymbol[selectedPortfolio];
  const last = portfolioTimeline.at(-1)!;

  return (
    <Card>
      <CardHeader title="Capital" />
      {/* Each figure takes an equal share of the card height, so the card is evenly filled next to its neighbours */}
      <CardContent className="flex flex-1 flex-col divide-y p-0">
        <div className="flex flex-1 flex-col justify-center gap-1.5 px-6 py-5">
          <StatLabel tooltip="Total amount of capital deposited into the portfolio, including cash withdrawn later">
            Total capital invested
          </StatLabel>
          <StatValue>{formatMoney(last.totalCapitalInvested, currencySymbol)}</StatValue>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1.5 px-6 py-5">
          <StatLabel tooltip="Total amount of capital deposited into the portfolio minus cash withdrawn later">
            Total capital balance
          </StatLabel>
          <StatValue>{formatMoney(last.balance, currencySymbol)}</StatValue>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1.5 px-6 py-5">
          <StatLabel tooltip="Cash withdrawn from the portfolio. Use the switcher to include in or exclude from the total portfolio value">
            Withdrawn
          </StatLabel>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <StatValue>{formatMoney(last.totalCapitalInvested - last.balance, currencySymbol)}</StatValue>
            <label className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-xs transition-colors">
              <Checkbox
                checked={useWithdrawnCash}
                onCheckedChange={(checked) => setUseWithdrawnCash(checked === true)}
              />
              Include in portfolio value
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
