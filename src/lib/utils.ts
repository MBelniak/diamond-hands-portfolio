import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";
import { PortfolioData } from "@/lib/types";
import { openDB } from "idb";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function profitOrLossTextColor(profitOrLoss: number) {
  if (profitOrLoss > 0) return "text-green-600 dark:text-green-500";
  if (profitOrLoss < 0) return "text-red-600 dark:text-red-500";
  return "text-gray-900 dark:text-gray-200";
}

export const isDarkMode = (): boolean => {
  return (
    localStorage.getItem("theme") === "dark" ||
    (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
};

// IndexedDB utility for portfolioAnalysis
export const portfolioDataDB = {
  dbName: "DiamondHandsDB",
  storeName: "portfolioDataStore",

  async getDB() {
    return openDB(this.dbName, 1, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      },
    });
  },

  async setPortfolioData(data: PortfolioData): Promise<void> {
    const db = await this.getDB();
    const expiry = new Date();
    expiry.setHours(23, 59, 59, 999);
    await db.put(this.storeName, { data, expiry }, "portfolioData");
  },

  async getPortfolioData(): Promise<PortfolioData | null> {
    const db = await this.getDB();
    let result;
    try {
      result = await db.get(this.storeName, "portfolioData");
    } catch (e) {
      console.error(e);
      return null;
    }
    const { expiry, data } = result || {};
    if (data && expiry && new Date() < new Date(expiry)) {
      return data;
    } else {
      try {
        await db.delete(this.storeName, "portfolioData");
      } catch (e) {
        console.error(e);
        // Failed to delete - just ignore
        return null;
      }
      return null;
    }
  },

  async removePortfolioData(): Promise<void> {
    const db = await this.getDB();
    try {
      await db.delete(this.storeName, "portfolioData");
    } catch (e) {
      console.error(e);
      // Failed to delete - just ignore
    }
  },
};

export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export const CFDIndices: Record<string, { lotSize: number }> = {
  GOLD: {
    lotSize: 100, // leverage is already included in the volume in xtb report.
  },
  OIL: {
    lotSize: 1000,
  },
};
