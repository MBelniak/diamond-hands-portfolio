"use client";
import React, { type PropsWithChildren } from "react";
import { useStore } from "@/lib/store";
import { redirect } from "next/navigation";
import { clsx } from "clsx";
import { profitOrLossTextColor } from "@/lib/utils";
import { PortfolioValueSummary } from "@/app/(analysis)/performance/PortfolioValueSummary";
import { PortfolioCapitalSummary } from "@/app/(analysis)/performance/PortfolioCapitalSummary";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleQuestionMark } from "lucide-react";

const KeyFigureValue: React.FC<PropsWithChildren> = ({ children }) => {
  return <p className={"text-2xl  font-bold"}>{children}</p>;
};

export const PerformanceKeyFigures = () => {
  const { portfolioAnalysis, selectedReturnMetric } = useStore();

  if (!portfolioAnalysis) {
    redirect("/");
  }

  const portfolioTimeline = portfolioAnalysis.portfolioTimeline;
  if (!portfolioTimeline.length) {
    return null;
  }
  const last = portfolioTimeline.at(-1)!;
  const sp500ProfitOrLoss = last.sp500Value - last.totalCapitalInvested;
  const sp500Percentage = {
    SR: (last.totalCapitalInvested != 0 ? sp500ProfitOrLoss / last.totalCapitalInvested : 0) * 100,
    TWR: 0, //TODO
    MWR: 0, //TODO
  };
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl w-full flex-col flex flex-wrap lg:flex-row lg:justify-around">
      <PortfolioValueSummary portfolioAnalysis={portfolioAnalysis} />
      <PortfolioCapitalSummary portfolioAnalysis={portfolioAnalysis} />
      <div className="p-8 flex flex-col items-start">
        <strong className=" text-lg ">
          If invested in SP500{" "}
          <Tooltip>
            <TooltipTrigger>
              <CircleQuestionMark size={20} />
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              <p>If invested all deposited cash into S&P 500 index without withdrawals</p>
            </TooltipContent>
          </Tooltip>
        </strong>
        <KeyFigureValue>${last.sp500Value.toFixed(2)}</KeyFigureValue>
        <p className={"text-sm  text-gray-800 dark:text-gray-200 mt-2"}>
          {sp500ProfitOrLoss >= 0 ? "Potential profit: " : "Potential loss: "}
          <span className={clsx("text-sm  mt-1", profitOrLossTextColor(sp500ProfitOrLoss))}>
            ${sp500ProfitOrLoss.toFixed(2)} ({sp500Percentage[selectedReturnMetric].toFixed(2)}%)
          </span>
        </p>
        <strong className="text-md mt-4">P & L breakdown</strong>
        <p>TODO</p>
      </div>
    </div>
  );
};
