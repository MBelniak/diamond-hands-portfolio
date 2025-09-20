import { NextResponse } from "next/server";
import parsePortfolioFile from "../../../xlsx-parser/parseXlsx";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ error: 'Missing required "file" parameter.' }, { status: 400 });
  }
  if (!file.name.endsWith(".xlsx")) {
    return NextResponse.json({ error: "Only XLSX files allowed." }, { status: 400 });
  }
  const analysis = await parsePortfolioFile(await file.arrayBuffer());
  return Response.json(analysis);
}
