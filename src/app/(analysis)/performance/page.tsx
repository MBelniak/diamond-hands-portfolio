import { PerformanceKeyFigures } from "@/app/(analysis)/performance/PerformanceKeyFigures";
import { PerformanceChart } from "@/app/(analysis)/performance/PerformanceChart";

export default function PerformancePage() {
  return (
    <>
      <PerformanceKeyFigures />
      <PerformanceChart />
    </>
  );
}
