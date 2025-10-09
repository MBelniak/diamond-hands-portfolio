import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PortfolioAnalysis } from "@/xlsx-parser/types";

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
export const portfolioAnalysisDB = {
  dbName: "DiamondHandsDB",
  storeName: "portfolioAnalysisStore",

  async getDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async setPortfolioAnalysis(data: PortfolioAnalysis) {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      store.put(data, "portfolioAnalysis");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getPortfolioAnalysis() {
    const db = await this.getDB();
    return new Promise<PortfolioAnalysis>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.get("portfolioAnalysis");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async removePortfolioAnalysis() {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      store.delete("portfolioAnalysis");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
