import React, { type PropsWithChildren } from "react";
import { CircleQuestionMark } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const InfoTooltip: React.FC<PropsWithChildren> = ({ children }) => (
  <Tooltip>
    <TooltipTrigger
      className="text-muted-foreground hover:text-foreground cursor-help transition-colors"
      aria-label="More information"
    >
      <CircleQuestionMark size={14} />
    </TooltipTrigger>
    <TooltipContent side="bottom" align="center" className="max-w-xs">
      <p>{children}</p>
    </TooltipContent>
  </Tooltip>
);

/** Small uppercase caption that sits above a figure. */
export const StatLabel: React.FC<PropsWithChildren<{ tooltip?: React.ReactNode; className?: string }>> = ({
  children,
  tooltip,
  className,
}) => (
  <div
    className={cn(
      "text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase",
      className,
    )}
  >
    {children}
    {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
  </div>
);

const statValueSize = {
  lg: "text-4xl",
  md: "text-3xl",
  sm: "text-2xl",
} as const;

/** The figure itself: large, light weight, tabular digits. */
export const StatValue: React.FC<PropsWithChildren<{ size?: keyof typeof statValueSize; className?: string }>> = ({
  children,
  size = "sm",
  className,
}) => (
  <p className={cn("leading-tight font-light tracking-tight tabular-nums", statValueSize[size], className)}>
    {children}
  </p>
);

/** One "label ........ value" line of a compact metrics list. */
export const MetricRow: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
}> = ({ label, value, valueClassName }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <dt className="text-muted-foreground text-sm">{label}</dt>
    <dd className={cn("text-sm tabular-nums", valueClassName)}>{value}</dd>
  </div>
);
