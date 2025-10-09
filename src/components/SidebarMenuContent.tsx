"use client";
import { TrendingUp, Wallet } from "lucide-react";
import React, { useEffect, useState } from "react";

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
  const [isDark, setIsDark] = useState(false);

  // On mount, set theme from localStorage or system preference
  useEffect(() => {
    const local = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = local ? local === "dark" : systemPrefersDark;
    setIsDark(shouldBeDark);
    document.body.classList.toggle("dark", shouldBeDark);
  }, []);

  // When toggled, update theme and localStorage
  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.body.classList.toggle("dark", newIsDark);
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
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
