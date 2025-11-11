import { create } from "zustand";
import { ReturnMetric } from "@/lib/returnMetrics";

interface Store {
  selectedReturnMetric: ReturnMetric;
  setSelectedReturnMetric: (data: ReturnMetric) => void;
  useWithdrawnCash: boolean;
  setUseWithdrawnCash: (data: boolean) => void;
}

export const useStore = create<Store>((set) => ({
  selectedReturnMetric: "SR",
  setSelectedReturnMetric: (data: ReturnMetric) => {
    set({ selectedReturnMetric: data });
  },
  useWithdrawnCash: false,
  setUseWithdrawnCash: (data: boolean) => {
    set({ useWithdrawnCash: data });
  },
}));
