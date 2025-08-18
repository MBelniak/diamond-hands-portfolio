import portfolioTimeline from "../../../dist/portfolioTimeline.json";
import React, { type PropsWithChildren } from "react";

const KeyFigureValue: React.FC<PropsWithChildren> = ({ children }) => {
  return <p className={"text-2xl"}>{children}</p>;
};

export const PerformanceKeyFigures = () => {
  return (
    <div className={"w-full flex-col flex flex-wrap lg:flex-row lg:justify-around"}>
      <div className={"p-8 flex flex-col items-start"}>
        <strong>Total portfolio value</strong>
        <KeyFigureValue>{portfolioTimeline.at(-1)?.portfolioValue.toFixed(2)}$</KeyFigureValue>
        <p className={"text-sm"}>
          {portfolioTimeline.at(-1)!.profitOrLoss > 0 ? "Realized profit: " : "Realized loss: "}{" "}
          {portfolioTimeline.at(-1)!.profitOrLoss.toFixed(2)}$
        </p>
      </div>
      <div className={"p-8"}>
        <strong>Total value invested</strong>
        <KeyFigureValue>{portfolioTimeline.at(-1)?.balance.toFixed(2)}$</KeyFigureValue>
      </div>
      <div className={"p-8"}>
        <strong>If invested in SP500</strong>
        <KeyFigureValue>{portfolioTimeline.at(-1)?.sp500Value.toFixed(2)}$</KeyFigureValue>
      </div>
    </div>
  );
};
