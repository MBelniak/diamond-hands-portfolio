import { buildPortfolioData } from "@/lib/xlsx-parser/parseXlsx";
import demoPortfolioEvents from "@/lib/demo-data.json";
import { PortfolioCurrency, PortfolioEvents } from "@/lib/types";

export async function getDemoPortfolioData(currency: PortfolioCurrency) {
  return await buildPortfolioData(demoPortfolioEvents as PortfolioEvents, currency);
}
