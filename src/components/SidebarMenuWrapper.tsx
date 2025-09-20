import React, { PropsWithChildren } from "react";
import { SidebarContent, Sidebar, SidebarProvider } from "./ui/sidebar";
import { SidebarMenuContent } from "./SidebarMenuContent";

export const SidebarMenuWrapper: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarMenuContent />
        </SidebarContent>
      </Sidebar>
      <main className={"w-full"}>{children}</main>
    </SidebarProvider>
  );
};
