"use client";
import { TrendingUp, Wallet } from "lucide-react";
import React, { useState } from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { useCurrentTheme } from "@/hooks/useCurrentTheme";

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
];

export const SidebarMenuContent = () => {
  // Theme switcher logic
  const { theme, setCurrentTheme } = useCurrentTheme();
  const [isDark, setIsDark] = useState(theme === "dark");

  // When toggled, update theme and localStorage
  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    setCurrentTheme(newIsDark ? "dark" : "light");
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Diamond hands portfolio</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup className={"mt-[auto] mb-2"}>
        <SidebarGroupContent>
          <div style={{ marginTop: "auto", padding: "1rem 0 0 0" }}>
            <div style={{ borderTop: "1px solid #e5e7eb", marginBottom: "1rem", opacity: 0.5 }} />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.95rem",
                cursor: "pointer",
                opacity: 0.8,
              }}
            >
              <Switch checked={isDark} onCheckedChange={handleThemeToggle} />
              Dark mode
            </label>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
};
