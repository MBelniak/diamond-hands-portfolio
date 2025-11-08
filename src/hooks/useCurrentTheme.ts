"use client";
import { useCallback, useEffect } from "react";

export type LocalTheme = "dark" | "light";

export const useCurrentTheme = () => {
  const isBrowser = typeof window !== "undefined";

  const getCurrentTheme = useCallback((): LocalTheme => {
    if (!isBrowser) return "light";

    const local = localStorage.getItem("theme") as LocalTheme | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = local ? local === "dark" : systemPrefersDark;
    return shouldBeDark ? "dark" : "light";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrentTheme = useCallback((newTheme: LocalTheme) => {
    if (!isBrowser) return;

    document.body.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isBrowser) return;

    const shouldBeDark = getCurrentTheme() === "dark";
    document.body.classList.toggle("dark", shouldBeDark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCurrentTheme]);

  return { getCurrentTheme, setCurrentTheme };
};
