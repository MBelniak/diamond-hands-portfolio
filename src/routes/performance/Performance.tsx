import { PerformanceChart } from "@/routes/performance/PerformanceChart.tsx";
import { PerformanceKeyFigures } from "./PerformanceKeyFigures";

export const Performance = () => {
  return (
    <section className={"p-4 pr-10 flex gap-8 flex-col"}>
      <PerformanceKeyFigures />
      <PerformanceChart />
    </section>
  );
};
