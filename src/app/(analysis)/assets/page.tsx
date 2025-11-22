"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortfolioAnalysis } from "@/app/_react-query/usePortfolioAnalysis";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useAssetsBreakdown } from "@/app/(analysis)/assets/_hooks/useAssetsBreakdown";
import { sortBy, sumBy } from "lodash-es";
import { AssetsTable } from "./_components/AssetsTable";
import { columns } from "./_components/columns";

export default function AssetsPage() {
  const { data: portfolioAnalysis, error, isLoading } = usePortfolioAnalysis();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      router.push("/");
    }
  }, [error, router]);

  const assetsBreakdown = useAssetsBreakdown(portfolioAnalysis) ?? [];
  const tableData = sortBy(assetsBreakdown, ["allocation", "accProfitOrLoss"]).reverse();

  // compute maximum absolute profit magnitude to scale color thresholds
  const maxAbsProfit = tableData.reduce((acc, stock) => {
    const cand = Math.max(
      Math.abs(stock.accProfitOrLoss ?? 0),
      Math.abs(stock.unrealizedProfitOrLoss ?? 0),
      Math.abs(stock.potentialValue ?? 0),
    );
    return Math.max(acc, cand);
  }, 0);

  // attach profitScale to each row so cells can use relative thresholds
  const tableDataScaled = tableData.map((row) => ({ ...row, profitScale: maxAbsProfit }));

  // compute totals and keep separate from data (rendered in dedicated footer)
  const totalsRow = {
    assetSymbol: "Total",
    longName: "",
    volume: sumBy(assetsBreakdown, "volume"),
    marketValue: sumBy(assetsBreakdown, "marketValue"),
    accProfitOrLoss: sumBy(assetsBreakdown, "accProfitOrLoss"),
    unrealizedProfitOrLoss: sumBy(assetsBreakdown, "unrealizedProfitOrLoss"),
    potentialValue: sumBy(assetsBreakdown, "potentialValue"),
    allocation: 0,
    profitScale: maxAbsProfit,
  } as (typeof tableDataScaled)[number] & { profitScale?: number };

  if (isLoading || error) {
    return (
      <>
        <DiamondLoader />
        <p>loading your data...</p>
      </>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-3  w-full mx-4">
      <div className="overflow-x-auto">
        <AssetsTable columns={columns} data={tableDataScaled} totals={totalsRow} />
      </div>
    </div>
  );
}
