
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { buildQuoteData } from "../../../lib/rawBusiness";
import { renderTemplate } from "../../../lib/pdfTemplates";

export const runtime = "nodejs";

export async function POST(req){

  const form = await req.formData().catch(()=>null);
  let body;

  if(form){
     body = JSON.parse(form.get("payload"));
  }else{
     body = await req.json();
  }

  const data = await buildQuoteData(body);
  const html = renderTemplate(data);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true
  });

  const page = await browser.newPage();
  await page.setContent(html,{waitUntil:"networkidle0"});

  const pdf = await page.pdf({
    format:"A4",
    printBackground:true
  });

  await browser.close();

  return new NextResponse(pdf,{
    headers:{
      "Content-Type":"application/pdf",
      "Content-Disposition":'inline; filename="TKP.pdf"'
    }
  });
}
