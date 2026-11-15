import { ChartOptions, ColorType, DeepPartial } from "lightweight-charts";
import { LocalTheme } from "@/client/hooks/useCurrentTheme";

/** lightweight-charts options matching the flat, outlined card look (transparent background, hairline grid). */
export const getChartOptions = (theme: LocalTheme): DeepPartial<ChartOptions> => {
  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.07)";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.12)";

  return {
    // Fixed locale so axis labels don't depend on the viewer's browser language
    localization: { locale: "en-US" },
    layout: {
      textColor: isDark ? "#a1a1aa" : "#52525b",
      // Canvas can't resolve CSS variables, so use the page's resolved font stack (Geist)
      fontFamily: typeof window !== "undefined" ? getComputedStyle(document.body).fontFamily : undefined,
      background: { type: ColorType.Solid, color: "transparent" },
    },
    grid: {
      vertLines: { color: gridColor },
      horzLines: { color: gridColor },
    },
    rightPriceScale: { borderColor },
    timeScale: { borderColor },
    crosshair: {
      vertLine: { color: borderColor, labelBackgroundColor: isDark ? "#334155" : "#475569" },
      horzLine: { color: borderColor, labelBackgroundColor: isDark ? "#334155" : "#475569" },
    },
  };
};
