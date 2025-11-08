"use client";
import { SignIn } from "@clerk/nextjs";
import { useEffect } from "react";
import { portfolioDataDB } from "@/lib/utils";

export default function Page() {
  useEffect(() => {
    portfolioDataDB.removePortfolioData().then();
  }, []);

  return (
    <div className={"flex justify-center items-center min-h-screen light-gradient dark:dark-gradient"}>
      <SignIn />
    </div>
  );
}
