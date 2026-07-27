import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPortfolioEventsForUser } from "@/lib/xlsx-parser/parseXlsx";
import { PortfolioCurrency } from "@/lib/types";
import { getDemoPortfolioData } from "@/lib/demo/getDemoData";
import { DEMO_MODE_COOKIE_KEY } from "@/app/consts";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const currency = (url.searchParams.get("selectedPortfolio") as PortfolioCurrency) || PortfolioCurrency.USD;
  const cookieStore = await cookies();
  const demoMode = cookieStore.get(DEMO_MODE_COOKIE_KEY)?.value === "true";

  if (demoMode) {
    const data = await getDemoPortfolioData(currency);
    return NextResponse.json(data);
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  const data = await getPortfolioEventsForUser(user, currency);

  return NextResponse.json(data);
}
