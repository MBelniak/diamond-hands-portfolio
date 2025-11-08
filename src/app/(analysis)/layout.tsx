import { SidebarMenuWrapper } from "@/components/SidebarMenuWrapper";
import { AuthenticationHeader } from "@/app/_components/AuthenticationHeader";
import React from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SidebarMenuWrapper>
        <div className={"light-gradient dark:dark-gradient min-h-screen"}>
          <AuthenticationHeader />
          <section className={"flex-col gap-8 p-8 flex items-center justify-center"}>{children}</section>
        </div>
      </SidebarMenuWrapper>
    </>
  );
}
