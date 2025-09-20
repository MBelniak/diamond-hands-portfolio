import { PerformanceKeyFigures } from "@/app/(analysis)/performance/PerformanceKeyFigures";
import { PerformanceChart } from "@/app/(analysis)/performance/PerformanceChart";

export default function PerformancePage() {
  return (
    <section className={"p-4 pr-10 flex gap-8 flex-col"}>
      <PerformanceKeyFigures />
      <PerformanceChart />
    </section>
  );
}
