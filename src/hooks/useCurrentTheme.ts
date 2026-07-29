"use client";
import { useCallback, useEffect } from "react";
import { getCurrentTheme, LocalTheme } from "@/client/hooks/useCurrentTheme";
import { useStore } from "@/lib/store";

export const useCurrentTheme = () => {
  const { theme, setTheme } = useStore();

  const setCurrentTheme = useCallback((newTheme: LocalTheme) => {
    const apply = () => {
      setTheme(newTheme);
      document.body.classList.toggle("dark", newTheme === "dark");
      localStorage.setItem("theme", newTheme);
    };

    if (document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const shouldBeDark = getCurrentTheme() === "dark";
    document.body.classList.toggle("dark", shouldBeDark);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCurrentTheme]);

  return { theme, setCurrentTheme };
};
