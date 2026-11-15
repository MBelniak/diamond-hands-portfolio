"use client";
import { ArrowLeftRight, Gem, Moon, ShieldAlert, TrendingUp, Wallet } from "lucide-react";
import React, { useState } from "react";

import {
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Switch } from "@/components/ui/switch";

import { useCurrentTheme } from "@/hooks/useCurrentTheme";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const items = [
  {
    title: "Performance",
    url: "/performance",
    icon: TrendingUp,
  },
  {
    title: "Assets",
    url: "/assets",
    icon: Wallet,
  },
  {
    title: "Risk analysis",
    url: "/risk",
    icon: ShieldAlert,
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: ArrowLeftRight,
  },
];

export const SidebarMenuContent = () => {
  // Theme switcher logic
  const { theme, setCurrentTheme } = useCurrentTheme();
  const [isDark, setIsDark] = useState(theme === "dark");
  const { setIsNavigating } = useNavigationLoading();
  const pathname = usePathname();

  // When toggled, update theme and localStorage
  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    setCurrentTheme(newIsDark ? "dark" : "light");
  };

  return (
    <>
      <SidebarHeader className="h-16 flex-row items-center gap-3 border-b px-4 py-0">
        <span className="flex size-8 shrink-0 items-center justify-center border">
          <Gem className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium">Diamond Hands</span>
          <span className="text-muted-foreground truncate text-xs">Portfolio analytics</span>
        </div>
      </SidebarHeader>

      <SidebarGroup className="px-3 py-4">
        <SidebarGroupLabel>Analysis</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1.5">
            {items.map((item) => {
              // Asset detail pages (/assets/XYZ) keep "Assets" highlighted
              const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link
                      href={item.url}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => {
                        if (pathname !== item.url) setIsNavigating(true);
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarFooter className="mt-auto border-t p-3">
        <label className="hover:bg-surface-strong flex h-11 cursor-pointer items-center justify-between gap-3 px-3 text-[0.9375rem] transition-colors">
          <span className="text-foreground/75 flex items-center gap-3">
            <Moon className="size-[1.125rem]" />
            Dark mode
          </span>
          <Switch checked={isDark} onCheckedChange={handleThemeToggle} />
        </label>
      </SidebarFooter>
    </>
  );
};
