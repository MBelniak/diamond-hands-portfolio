"use client";
import React, { type PropsWithChildren } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleQuestionMark } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingLevel = "excellent" | "good" | "moderate" | "poor" | "severe" | "neutral";

const ratingClasses: Record<RatingLevel, string> = {
  excellent: "text-green-600 dark:text-green-400",
  good: "text-green-500 dark:text-green-500",
  moderate: "text-yellow-600 dark:text-yellow-400",
  poor: "text-orange-600 dark:text-orange-400",
  severe: "text-red-600 dark:text-red-500",
  neutral: "text-gray-900 dark:text-gray-200",
};

const ratingLabels: Record<RatingLevel, string> = {
  excellent: "Excellent",
  good: "Good",
  moderate: "Moderate",
  poor: "Poor",
  severe: "Severe",
  neutral: "—",
};

interface RiskMetricCardProps {
  title: string;
  value: string;
  rating: RatingLevel;
  tooltip: string;
  subtitle?: string;
}

export const RiskMetricCard: React.FC<PropsWithChildren<RiskMetricCardProps>> = ({
  title,
  value,
  rating,
  tooltip,
  subtitle,
  children,
}) => {
  return (
    <div className="p-6 flex flex-col gap-1 bg-white/5 backdrop-blur-lg rounded-sm shadow-md">
      <div className="flex items-center gap-2">
        <strong className="text-base">{title}</strong>
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark size={16} className="opacity-60" />
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <p className={cn("text-3xl font-bold mt-1", ratingClasses[rating])}>{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-70">
        {ratingLabels[rating]}
        {subtitle ? ` · ${subtitle}` : ""}
      </p>
      {children}
    </div>
  );
};

export function sharpeRating(v: number): RatingLevel {
  if (v >= 2) return "excellent";
  if (v >= 1) return "good";
  if (v >= 0.5) return "moderate";
  if (v >= 0) return "poor";
  return "severe";
}

export function volatilityRating(v: number): RatingLevel {
  if (v <= 0.1) return "excellent";
  if (v <= 0.15) return "good";
  if (v <= 0.25) return "moderate";
  if (v <= 0.4) return "poor";
  return "severe";
}

export function drawdownRating(v: number): RatingLevel {
  const abs = Math.abs(v);
  if (abs <= 0.05) return "excellent";
  if (abs <= 0.15) return "good";
  if (abs <= 0.3) return "moderate";
  if (abs <= 0.5) return "poor";
  return "severe";
}

export function var95Rating(v: number): RatingLevel {
  const abs = Math.abs(v);
  if (abs <= 0.01) return "excellent";
  if (abs <= 0.02) return "good";
  if (abs <= 0.03) return "moderate";
  if (abs <= 0.05) return "poor";
  return "severe";
}

export function betaRating(v: number): RatingLevel {
  if (v < 0.5) return "excellent";
  if (v < 0.8) return "good";
  if (v <= 1.2) return "moderate";
  if (v <= 1.5) return "poor";
  return "severe";
}
