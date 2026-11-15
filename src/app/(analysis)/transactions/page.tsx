"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePageEntrance } from "@/client/hooks/usePageEntrance";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { usePortfolioData } from "@/app/_react-query/usePortfolioData";
import { useTransactions } from "@/app/(analysis)/transactions/_hooks/useTransactions";
import { TransactionFilters } from "@/app/(analysis)/transactions/_components/TransactionFilters";
import { TransactionsTable } from "@/app/(analysis)/transactions/_components/TransactionsTable";
import { TransactionType } from "@/app/(analysis)/transactions/_types";
import { PageHeader } from "@/components/ui/page-header";

export default function TransactionsPage() {
  const { data: portfolioData, error, isLoading } = usePortfolioData();
  const router = useRouter();

  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);

  React.useEffect(() => {
    if (error) {
      router.push("/");
    }
  }, [error, router]);

  const cashEvents = portfolioData?.portfolioEvents.cashEvents ?? [];
  const allTransactions = useTransactions(cashEvents, portfolioData?.stockMarketData);

  const availableTickers = useMemo(() => {
    const tickerSet = new Set<string>();
    for (const tx of allTransactions) {
      if (tx.ticker) tickerSet.add(tx.ticker);
    }
    return Array.from(tickerSet).toSorted((a, b) => a.localeCompare(b));
  }, [allTransactions]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(tx.type)) return false;
      if (selectedTickers.length > 0 && (tx.ticker === null || !selectedTickers.includes(tx.ticker))) return false;
      return true;
    });
  }, [allTransactions, selectedTypes, selectedTickers]);

  const willRenderContent = !isLoading && !error && portfolioData;
  const containerRef = usePageEntrance(!!willRenderContent);

  if (isLoading || error) {
    return (
      <>
        <DiamondLoader />
        <p>Loading your data...</p>
      </>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-4" ref={containerRef}>
      <PageHeader
        title="Transactions"
        description={`${filteredTransactions.length} of ${allTransactions.length} transactions`}
      />

      <TransactionFilters
        selectedTypes={selectedTypes}
        onTypesChange={setSelectedTypes}
        availableTickers={availableTickers}
        selectedTickers={selectedTickers}
        onTickersChange={setSelectedTickers}
      />

      <TransactionsTable rows={filteredTransactions} />
    </div>
  );
}
