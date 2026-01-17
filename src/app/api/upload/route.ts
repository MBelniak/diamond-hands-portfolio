import { NextResponse } from "next/server";
import { uploadPortfolioData } from "@/lib/xlsx-parser/parseXlsx";
import { currentUser } from "@clerk/nextjs/server";
import { PortfolioCurrency } from "@/lib/types";

export async function POST(request: Request) {
  const formData = await request.formData();
  const selectedPortfolio = formData.get("selectedPortfolio") as PortfolioCurrency | undefined;
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ error: 'Missing required "file" parameter.' }, { status: 400 });
  }
  if (!selectedPortfolio) {
    return NextResponse.json({ error: 'Missing required "selectedPortfolio" parameter.' }, { status: 400 });
  }

  if (!file.name.endsWith(".xlsx")) {
    return NextResponse.json({ error: "Only XLSX files allowed." }, { status: 400 });
  }

  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await uploadPortfolioData(user, selectedPortfolio, await file.arrayBuffer());

  return NextResponse.json({}, { status: 201 });
}
