"use client";

export type LocalTheme = "dark" | "light";

export const getCurrentTheme = (): LocalTheme => {
  const isBrowser = typeof window !== "undefined";

  if (!isBrowser) return "light";

  const local = localStorage.getItem("theme") as LocalTheme | null;
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldBeDark = local ? local === "dark" : systemPrefersDark;
  return shouldBeDark ? "dark" : "light";
};
