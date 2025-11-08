import React from "react";
import HomePage from "@/app/_components/HomePage";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AuthenticationHeader } from "@/app/_components/AuthenticationHeader";

export default async function Page() {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  return (
    <div className={"light-gradient dark:dark-gradient min-h-screen"}>
      <AuthenticationHeader />
      <section className={"flex-col h-full gap-8 p-8 flex items-center justify-center"}>
        <HomePage />
      </section>
    </div>
  );
}
