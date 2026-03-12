import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { buildQuoteData } from "../../../lib/rawBusiness";
import { renderTemplate } from "../../../lib/pdfTemplates";

export const runtime = "nodejs";
export const maxDuration = 60;

function safeFileName(s) {
  return String(s || "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req) {
  let browser = null;

  try {
    const body = await req.json();
    const data = await buildQuoteData(body);
    const html = renderTemplate(data);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1440, height: 2048, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    });

    await browser.close();

    const filename =
      safeFileName(`${data.tkpNumber} ${data.customer} ${data.modelTitleTop}`) + ".pdf";

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    if (browser) {
      try { await browser.close(); } catch {}
    }

    return NextResponse.json(
      { ok: false, error: String(e.message || e) },
      { status: 500 }
    );
  }
}
