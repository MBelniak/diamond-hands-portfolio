import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleQuestionMark } from "lucide-react";
import React, { type PropsWithChildren } from "react";
import { PortfolioAnalysis } from "@/lib/xlsx-parser/types";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";

const KeyFigureValue: React.FC<PropsWithChildren> = ({ children }) => {
  return <p className={"text-2xl  font-bold"}>{children}</p>;
};

export const PortfolioCapitalSummary: React.FC<{
  portfolioAnalysis: PortfolioAnalysis;
}> = ({ portfolioAnalysis }) => {
  const { useWithdrawnCash, setUseWithdrawnCash } = useStore();
  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  if (!portfolioTimeline.length) {
    return null;
  }
  const last = portfolioTimeline.at(-1)!;

  return (
    <div className="p-8 flex flex-col items-start">
      <strong className="text-lg">
        Total capital invested{" "}
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark size={20} />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <p>Total amount of capital deposited into the portfolio, including cash withdrawn later</p>
          </TooltipContent>
        </Tooltip>
      </strong>
      <KeyFigureValue>${last.totalCapitalInvested.toFixed(2)}</KeyFigureValue>
      <strong className="text-lg mt-4">
        Total capital balance{" "}
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark size={20} />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <p>Total amount of capital deposited into the portfolio minus cash withdrawn later</p>
          </TooltipContent>
        </Tooltip>
      </strong>
      <KeyFigureValue>${last.balance.toFixed(2)}</KeyFigureValue>
      <div className={"mt-4 flex items-center gap-6"}>
        <strong className="text-lg ">Withdrawn </strong>
        <Switch checked={useWithdrawnCash} onCheckedChange={(checked) => setUseWithdrawnCash(checked)} />
      </div>
      <KeyFigureValue>${(last.totalCapitalInvested - last.balance).toFixed(2)}</KeyFigureValue>
    </div>
  );
};
