import { NextResponse } from "next/server";
import { findBestModel } from "../../../lib/rawBusiness";

export async function POST(req) {
  try {
    const body = await req.json();
    const result = await findBestModel({
      source: body.source,
      chuck_max_dia: Number(body.chuck_max_dia || 0),
      max_len: Number(body.max_len || 0),
      bar_max_dia: Number(body.bar_max_dia || 0),
      chuck_dia: body.chuck_dia || "",
      wantM: !!body.wantM,
      wantY: !!body.wantY,
      wantS: !!body.wantS
    });

    if (!result) {
      return NextResponse.json({ ok: false, message: "Подходящая модель не найдена" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
