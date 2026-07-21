import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPortfolioEventsForUser } from "@/lib/xlsx-parser/parseXlsx";
import { PortfolioCurrency } from "@/lib/types";
import { getDemoPortfolioData } from "@/lib/demo/getDemoData";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const demoMode = url.searchParams.get("demoData") === "true";
  const currency = (url.searchParams.get("selectedPortfolio") as PortfolioCurrency) || PortfolioCurrency.USD;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (demoMode) {
    const data = await getDemoPortfolioData(currency);
    return NextResponse.json(data);
  }

  const data = await getPortfolioEventsForUser(user, currency);

  return NextResponse.json(data);
}
