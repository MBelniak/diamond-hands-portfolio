import { useCallback, useEffect } from "react";

export type LocalTheme = "dark" | "light";

export const useCurrentTheme = () => {
  const getCurrentTheme = useCallback((): LocalTheme => {
    const local = localStorage.getItem("theme") as LocalTheme | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = local ? local === "dark" : systemPrefersDark;
    return shouldBeDark ? "dark" : "light";
  }, []);

  const setCurrentTheme = useCallback((newTheme: LocalTheme) => {
    document.body.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  }, []);

  useEffect(() => {
    const shouldBeDark = getCurrentTheme() === "dark";
    document.body.classList.toggle("dark", shouldBeDark);
  }, [getCurrentTheme]);

  return { getCurrentTheme, setCurrentTheme };
};
