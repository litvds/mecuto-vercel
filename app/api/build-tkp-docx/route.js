import { NextResponse } from "next/server";
import { getCurrentUser, requireRole } from "../../../lib/auth";
import { buildQuoteData } from "../../../lib/rawBusiness";
import { buildDocxBuffer } from "../../../lib/docxBuilder";
import { appendTKPLog } from "../../../lib/rolesSheets";

export const runtime = "nodejs";
export const maxDuration = 60;

function asciiFileName(s) {
  return String(s || "TKP")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/g, "_")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/_+/g, "_")
    .slice(0, 120) || "TKP";
}

async function getPayload(req) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await req.json();
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const raw = form.get("payload");
    if (!raw) throw new Error("Не передан payload");
    return JSON.parse(String(raw));
  }
  const text = await req.text();
  if (text) {
    try { return JSON.parse(text); } catch {}
  }
  throw new Error("Неподдерживаемый формат запроса");
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    requireRole(user, ["sales_director", "ceo"]);

    const body = await getPayload(req);
    const data = await buildQuoteData(body);
    const docx = await buildDocxBuffer(data);
    const asciiName = asciiFileName(`${data.tkpNumber || "TKP"} ${data.customer || ""} ${data.modelTitleTop || ""}`) + ".docx";

    await appendTKPLog({
      created_at: new Date().toISOString(),
      login: user.login,
      full_name: user.full_name || "",
      role: user.role,
      customer: data.customer || "",
      inn: data.inn || "",
      model: data.modelTitleTop || "",
      source: data.model?.source || "",
      total: data.totals?.total || 0,
      files: "DOCX",
      tkp_number: data.tkpNumber || "",
    });

    return new NextResponse(docx, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${asciiName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
