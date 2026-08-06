"use client";
import React from "react";
import { type RiskMetrics } from "@/lib/types";
import { BenchmarkIndex, BenchmarkIndexToName } from "@/lib/benchmarks";
import { betaRating, RiskMetricCard } from "@/app/(analysis)/risk/_components/RiskMetricCard";

export const RiskBetaBreakdown: React.FC<{ metrics: RiskMetrics }> = ({ metrics }) => {
  return (
    <div className="p-6 bg-white/5 backdrop-blur-lg rounded-sm shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <strong className="text-base">Beta vs Benchmarks</strong>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            />
          );
        })}
      </div>
    </div>
  );
};
