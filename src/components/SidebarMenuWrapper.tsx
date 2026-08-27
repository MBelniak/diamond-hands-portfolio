"use client";
import React, { PropsWithChildren } from "react";
import { SidebarContent, Sidebar, SidebarProvider } from "./ui/sidebar";
import { SidebarMenuContent } from "./SidebarMenuContent";
import { NavigationLoadingProvider, useNavigationLoading } from "./NavigationLoadingProvider";
import { LoaderOverlay } from "./ui/LoaderOverlay";

const SidebarMenuWrapperInner: React.FC<PropsWithChildren> = ({ children }) => {
  const { isNavigating } = useNavigationLoading();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarMenuContent />
        </SidebarContent>
      </Sidebar>
      <main className={"relative w-full overflow-auto"}>
        {children}
        {isNavigating && <LoaderOverlay />}
      </main>
    </SidebarProvider>
  );
};

export const SidebarMenuWrapper: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <NavigationLoadingProvider>
      <SidebarMenuWrapperInner>{children}</SidebarMenuWrapperInner>
    </NavigationLoadingProvider>
  );
};
