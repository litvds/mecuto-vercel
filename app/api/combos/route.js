import { NextResponse } from "next/server";
import { getComboTags } from "../../../lib/business";

export async function POST(req) {
  const body = await req.json();
  const source = String(body.source || "summury").toLowerCase();
  const tags = await getComboTags(source);
  return NextResponse.json({ ok: true, tags });
}
