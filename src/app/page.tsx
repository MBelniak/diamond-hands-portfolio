import React from "react";
import HomePage from "@/app/_components/HomePage";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { MainHeader } from "@/app/_components/MainHeader";
import { cookies } from "next/headers";
import { DEMO_MODE_COOKIE_KEY } from "@/app/consts";

export default async function Page() {
  const cookieStore = await cookies();
  const demoMode = cookieStore.get(DEMO_MODE_COOKIE_KEY)?.value === "true";

  if (!demoMode) {
    const { isAuthenticated } = await auth();

    if (!isAuthenticated) {
      redirect("/sign-in");
    }
  }

  return (
    <div className={"light-gradient dark:dark-gradient min-h-screen"}>
      <MainHeader initialDemoMode={demoMode} />
      <section className={"flex-col h-full gap-8 p-8 flex items-center justify-center"}>
        <HomePage />
      </section>
    </div>
  );
}
