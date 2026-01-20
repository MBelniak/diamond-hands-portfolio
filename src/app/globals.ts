import { ChartOptions, ColorType, DeepPartial } from "lightweight-charts";
import { LocalTheme } from "@/hooks/useCurrentTheme";

export const getChartOptions = (theme: LocalTheme): DeepPartial<ChartOptions> => {
  if (theme === "dark") {
    return {
      layout: {
        textColor: "#c5c5c5",
        background: {
          type: ColorType.VerticalGradient,
          topColor: "#101828",
          bottomColor: "#1c1917",
        },
      },
    };
  }

  return {
    layout: {
      textColor: "#2a2a2a",
      background: {
        type: ColorType.VerticalGradient,
        topColor: "#f9fafb",
        bottomColor: "#f1f5f9",
      },
    },
  };
};
