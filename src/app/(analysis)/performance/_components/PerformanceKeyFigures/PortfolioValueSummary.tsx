import { formatMoney, formatPercent, getProfitLossClass } from "@/lib/utils";
import React from "react";
import { PortfolioAnalysis, PortfolioCurrencyToSymbol } from "@/lib/types";
import { ProfitMetrics } from "./ProfitMetrics";
import { useStore } from "@/lib/store";
import { TimePeriod } from "@/app/(analysis)/performance/_types/TimePeriod";
import { getReturnOnTimeline, ReturnMetricsOnBenchmark } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";
import { omit } from "lodash-es";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MetricRow, StatLabel, StatValue } from "./KeyFigure";

export const PortfolioValueSummary: React.FC<{
  portfolioAnalysis: PortfolioAnalysis;
}> = ({ portfolioAnalysis }) => {
  const { selectedReturnMetric, useWithdrawnCash, selectedPortfolio } = useStore();
  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  if (!portfolioTimeline.length) {
    return null;
  }

  const currencySymbol = PortfolioCurrencyToSymbol[selectedPortfolio];
  const last = portfolioTimeline.at(-1)!;
  const totalCapitalInvested = last.totalCapitalInvested;

  const realizedProfitOrLoss = last.realizedProfitOrLoss;

  const totalPortfolioValue = useWithdrawnCash ? last.accPortfolioValue : last.portfolioValue;

  const valueTimeline = portfolioAnalysis.portfolioTimeline.map((el) => ({
    ...el,
    value: el.portfolioValue,
  }));
  const realizedPercentage = last.balance !== 0 ? (realizedProfitOrLoss / totalCapitalInvested) * 100 : 0;

  const returnOnPortfolio = getReturnOnTimeline(
    valueTimeline,
    portfolioAnalysis.cashFlow,
    totalCapitalInvested,
    [
      TimePeriod.OneWeek,
      TimePeriod.OneMonth,
      TimePeriod.ThreeMonths,
      TimePeriod.SixMonths,
      TimePeriod.OneYear,
      TimePeriod.All,
    ],
    selectedReturnMetric,
  );

  const totalProfit = returnOnPortfolio[TimePeriod.All].totalProfit;

  return (
    <Card>
      <CardHeader title="Total portfolio value" />
      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <StatValue size="lg">{formatMoney(totalPortfolioValue, currencySymbol)}</StatValue>
          <p className="text-sm tabular-nums">
            <span className={getProfitLossClass(totalProfit)}>
              {formatMoney(totalProfit, currencySymbol, { signed: true })} (
              {formatPercent(returnOnPortfolio[TimePeriod.All].return, { signed: true })})
            </span>
            <span className="text-muted-foreground ml-2">{totalProfit >= 0 ? "total profit" : "total loss"}</span>
          </p>
        </div>
        <dl className="border-y">
          <MetricRow
            label="Cashed in"
            valueClassName={getProfitLossClass(realizedProfitOrLoss)}
            value={
              <>
                {formatMoney(realizedProfitOrLoss, currencySymbol, { signed: true })}
                <span className="ml-2 opacity-80">({formatPercent(realizedPercentage, { signed: true })})</span>
              </>
            }
          />
        </dl>
        <div className="flex flex-col">
          <StatLabel>Open positions</StatLabel>
          <ProfitMetrics returns={omit(returnOnPortfolio, [TimePeriod.All]) as ReturnMetricsOnBenchmark} />
        </div>
      </CardContent>
    </Card>
  );
};
