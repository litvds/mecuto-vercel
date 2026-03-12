import { NextResponse } from "next/server";
import { getSourceMeta } from "../../../lib/rawBusiness";
export async function POST(req){try{const body=await req.json();const source=String(body.source||"summury").toLowerCase();return NextResponse.json({ok:true,...await getSourceMeta(source)});}catch(e){return NextResponse.json({ok:false,error:String(e.message||e)},{status:500});}}