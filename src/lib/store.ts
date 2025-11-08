import { create } from "zustand";
import { ReturnMetric } from "@/lib/returnMetrics";

interface Store {
  selectedReturnMetric: ReturnMetric;
  setSelectedReturnMetric: (data: ReturnMetric) => void;
}

export const useStore = create<Store>((set) => ({
  selectedReturnMetric: "SR",
  setSelectedReturnMetric: (data: ReturnMetric) => {
    set({ selectedReturnMetric: data });
  },
}));
