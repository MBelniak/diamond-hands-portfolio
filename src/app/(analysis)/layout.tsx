import { SidebarMenuWrapper } from "@/components/SidebarMenuWrapper";
import { MainHeader } from "@/app/_components/MainHeader";
import React from "react";
import { cookies } from "next/headers";
import { DEMO_MODE_COOKIE_KEY } from "@/app/consts";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const demoMode = cookieStore.get(DEMO_MODE_COOKIE_KEY)?.value === "true";

  return (
    <>
      <SidebarMenuWrapper>
        <div className={"light-gradient dark:dark-gradient min-h-screen"}>
          <MainHeader withSidebar initialDemoMode={demoMode} />
          <section className={"flex-col gap-8 p-8 flex items-center justify-center"}>{children}</section>
        </div>
      </SidebarMenuWrapper>
    </>
  );
}
