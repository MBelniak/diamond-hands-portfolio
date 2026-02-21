import { ReturnMetricsOnBenchmark } from "@/app/(analysis)/performance/_logic/getReturnOnTimeline";

export type BenchmarkRow = {
  benchmark: string;
} & ReturnMetricsOnBenchmark;
