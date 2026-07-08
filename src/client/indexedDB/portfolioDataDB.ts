// IndexedDB utility for portfolioAnalysis
import { openDB } from "idb";
import { PortfolioCurrency, PortfolioData } from "@/lib/types";

export const portfolioDataDB = {
  dbName: "DiamondHandsDB",
  storeName: "portfolioDataStore",

  async getDB() {
    return openDB(this.dbName, 1, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }

        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      },
    });
  },

  async setPortfolioData(data: PortfolioData, selectedPortfolio: PortfolioCurrency): Promise<void> {
    const db = await this.getDB();
    const expiry = new Date();
    expiry.setHours(23, 59, 59, 999);
    await db.put(this.storeName, { data, expiry }, this.getPortfolioRecordKey(selectedPortfolio));
  },

  async getPortfolioData(selectedPortfolio: PortfolioCurrency): Promise<PortfolioData | null> {
    const db = await this.getDB();
    let result;
    try {
      result = await db.get(this.storeName, this.getPortfolioRecordKey(selectedPortfolio));
    } catch (e) {
      console.error(e);
      return null;
    }
    const { expiry, data } = result || {};
    if (data && expiry && new Date() < new Date(expiry)) {
      return data;
    } else {
      this.removePortfolioData(selectedPortfolio).then(); // Clean up expired data
      return null;
    }
  },

  async removePortfolioData(selectedPortfolio: PortfolioCurrency): Promise<void> {
    const db = await this.getDB();
    try {
      await db.delete(this.storeName, this.getPortfolioRecordKey(selectedPortfolio));
    } catch (e) {
      console.error(e);
      // Failed to delete - just ignore
    }
  },

  getPortfolioRecordKey(selectedPortfolio: PortfolioCurrency): string {
    return `${this.storeName}_${selectedPortfolio}`;
  },
};
