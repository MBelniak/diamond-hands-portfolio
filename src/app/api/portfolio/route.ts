import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPortfolioData } from "@/lib/xlsx-parser/parseXlsx";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Example: fetch user-specific data
  const data = await getPortfolioData(user);

  return NextResponse.json(data);
}
