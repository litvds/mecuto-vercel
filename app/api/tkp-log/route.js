import { NextResponse } from "next/server";
import { getCurrentUser, requireRole } from "../../../lib/auth";
import { listTKPLogs } from "../../../lib/rolesSheets";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireRole(user, ["ceo"]);
    const items = await listTKPLogs(500);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
