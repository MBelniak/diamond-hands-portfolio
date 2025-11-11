import { CashFlow } from "@/lib/types";

export const getSP500CashFlow = (cashFlow: CashFlow) => {
  return cashFlow.filter((entry) => entry.amount >= 0);
};
