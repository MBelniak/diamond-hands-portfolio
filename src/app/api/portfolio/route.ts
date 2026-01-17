import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPortfolioData } from "@/lib/xlsx-parser/parseXlsx";
import { PortfolioCurrency } from "@/lib/types";

export async function GET(req: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currency = new URL(req.url).searchParams.get("selectedPortfolio") || "USD";
  const data = await getPortfolioData(user, currency as PortfolioCurrency);

  return NextResponse.json(data);
}
