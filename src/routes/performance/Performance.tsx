import { PerformanceChart } from "@/routes/performance/PerformanceChart.tsx";
import { PerformanceMatrix } from "@/routes/performance/PerformanceMatrix.tsx";

export const Performance = () => {
  return (
    <section className={"p-4 pr-10"}>
      <PerformanceChart />
      <PerformanceMatrix />
    </section>
  );
};
