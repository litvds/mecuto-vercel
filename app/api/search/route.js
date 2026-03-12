import { NextResponse } from "next/server";
import { findBestModel } from "../../../lib/business";

export async function POST(req) {
  const body = await req.json();
  const result = await findBestModel({
    source: body.source,
    combo_tag: body.combo_tag || "",
    chuck_max_dia: Number(body.chuck_max_dia || 0),
    max_len: Number(body.max_len || 0),
    bar_max_dia: Number(body.bar_max_dia || 0),
    wantM: !!body.wantM,
    wantY: !!body.wantY,
    wantS: !!body.wantS
  });

  if (!result) {
    return NextResponse.json({ ok: false, message: "Подходящая модель не найдена" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}
