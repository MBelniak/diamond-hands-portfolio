"use client";
import { SignIn } from "@clerk/nextjs";
import { useEffect } from "react";

import { portfolioDataDB } from "@/client/indexedDB/portfolioDataDB";
import { PortfolioCurrency } from "@/lib/types";

export default function Page() {
  useEffect(() => {
    Object.values(PortfolioCurrency).forEach((currency) => {
      portfolioDataDB.removePortfolioData(currency).then();
    });
  }, []);

  return (
    <div className={"flex justify-center items-center min-h-screen light-gradient dark:dark-gradient"}>
      <SignIn />
    </div>
  );
}
