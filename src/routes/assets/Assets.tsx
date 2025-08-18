import portfolioTimeline from "../../../dist/portfolioTimeline.json";
import { useMemo } from "react";
import type { PortfolioValue } from "../../../types";

export const Assets = () => {
  const data = portfolioTimeline as PortfolioValue[];

  const stocks = useMemo(() => {
    const finalDayData = data.at(-1)!;

    return Array.from(new Set(Object.keys(finalDayData.stocks))).toSorted((left, right) => {
      const rightVal = finalDayData.stocks[right]?.takenProfitOrLoss ?? 0;
      const leftVal = finalDayData.stocks[left]?.takenProfitOrLoss ?? 0;
      return rightVal - leftVal;
    });
  }, [data]);

  const profitLossValues = useMemo(() => {
    const finalDayData = data.at(-1)!;
    return stocks.map((stock) => {
      const obj = finalDayData.stocks[stock as keyof typeof finalDayData.stocks];
      return obj.takenProfitOrLoss ?? 0;
    });
  }, [data, stocks]);

  const minProfitLoss = Math.min(...profitLossValues);
  const maxProfitLoss = Math.max(...profitLossValues);

  function getProfitLossBgColor(value: number): string {
    if (maxProfitLoss === minProfitLoss) return "";
    if (value < 0) {
      return `hsl(0 100% ${(60 + ((minProfitLoss - value) / minProfitLoss) * 40).toFixed(0)}%)`;
    }
    return `hsl(105 100% ${(60 + ((maxProfitLoss - value) / maxProfitLoss) * 40).toFixed(0)}%)`;
  }

  return (
    <div className={"p-8"}>
      <h2 className={"text-left mb-4 text-xl"}>Assets breakdown</h2>
      <table className={"w-[600px]"}>
        <thead>
          <tr>
            <th className={"border border-solid border-[#ccc] p-1"}>Asset</th>
            <th className={"border border-solid border-[#ccc] p-1"}>Profit/Loss ($)</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const value = data.at(-1)!.stocks[stock]?.takenProfitOrLoss ?? 0;
            const bgColor = getProfitLossBgColor(value);
            return (
              <tr key={stock}>
                <td className={"border border-solid border-[#ccc] p-1"}>{stock}</td>
                <td className={`border border-solid border-[#ccc] p-1`} style={{ backgroundColor: bgColor }}>
                  {value?.toFixed(2) ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
