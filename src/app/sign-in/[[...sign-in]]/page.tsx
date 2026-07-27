"use client";
import { SignIn } from "@clerk/nextjs";
import { useEffect } from "react";

import { portfolioDataDB } from "@/client/indexedDB/portfolioDataDB";
import { TryDemoMode } from "@/app/_components/TryDemoMode";
import { PortfolioCurrency } from "@/lib/types";

export default function Page() {
  useEffect(() => {
    Object.values(PortfolioCurrency).forEach((currency) => {
      portfolioDataDB.removePortfolioData(currency).then();
    });
  }, []);

  return (
    <div className={"flex flex-col justify-center items-center gap-6 min-h-screen light-gradient dark:dark-gradient"}>
      <SignIn />
      <TryDemoMode />
    </div>
  );
}
