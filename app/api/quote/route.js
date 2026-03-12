import { NextResponse } from "next/server";
import { calcTotals } from "../../../lib/business";

export async function POST(req) {
  const body = await req.json();
  const totals = await calcTotals(
    body.model,
    body.selectedOptions || [],
    Number(body.distanceKm || 0),
    Number(body.warrantyMonths || 6)
  );
  return NextResponse.json({ ok: true, ...totals });
}
