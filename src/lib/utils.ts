import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function profitOrLossTextColor(profitOrLoss: number) {
  if (profitOrLoss > 0) return "text-green-400";
  if (profitOrLoss < 0) return "text-red-400";
  return "text-gray-500";
}
