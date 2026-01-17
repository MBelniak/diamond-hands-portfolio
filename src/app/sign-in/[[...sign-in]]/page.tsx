"use client";
import { SignIn } from "@clerk/nextjs";
import { useEffect } from "react";

import { portfolioDataDB } from "@/app/indexedDB/portfolioDataDB";
import { useStore } from "@/lib/store";

export default function Page() {
  const { selectedPortfolio } = useStore();
  useEffect(() => {
    portfolioDataDB.removePortfolioData(selectedPortfolio).then();
  }, [selectedPortfolio]);

  return (
    <div className={"flex justify-center items-center min-h-screen light-gradient dark:dark-gradient"}>
      <SignIn />
    </div>
  );
}
