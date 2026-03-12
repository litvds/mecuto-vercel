import { NextResponse } from "next/server";
import { buildQuoteData } from "../../../lib/rawBusiness";
import { renderTemplate } from "../../../lib/pdfTemplates";
function safe(s){return String(s||"").replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim()}
export async function POST(req){try{const body=await req.json();const data=await buildQuoteData(body);return NextResponse.json({ok:true,html:renderTemplate(data),filename:safe(`${data.tkpNumber} ${data.customer} ${data.modelTitleTop}`)+".pdf",tkpNumber:data.tkpNumber});}catch(e){return NextResponse.json({ok:false,error:String(e.message||e)},{status:500});}}