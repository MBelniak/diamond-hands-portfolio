"use client";
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type RiskMetrics } from "@/lib/types";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { betaRating, RiskMetricCard } from "@/app/(analysis)/risk/_components/RiskMetricCard";

export const RiskBetaBreakdown: React.FC<{ metrics: RiskMetrics }> = ({ metrics }) => {
  return (
    <Card>
      <CardHeader title="Beta vs benchmarks" description="Sensitivity of your portfolio to each index" />
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.values(BenchmarkIndex).map((index) => {
          const beta = metrics.beta[index];
          const rating = betaRating(beta);
          const label =
            beta < 0.8 ? "Defensive" : beta <= 1.2 ? "Market-like" : beta <= 1.5 ? "Aggressive" : "Very aggressive";
          return (
            <RiskMetricCard
              key={index}
              title={BenchmarkIndexToName[index]}
              value={beta.toFixed(2)}
              rating={rating}
              subtitle={label}
              tooltip={`Beta vs ${BenchmarkIndexToName[index]}. Values below 1 indicate lower volatility than the index; above 1 means higher.`}
              className="bg-transparent backdrop-blur-none"
            />
          );
        })}
      </CardContent>
    </Card>
  );
};
