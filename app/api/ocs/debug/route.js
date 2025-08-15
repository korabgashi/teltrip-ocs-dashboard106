
import { NextResponse } from "next/server";
export async function GET(){ return NextResponse.json({ ok:true, routes:["POST /api/ocs/list-subscribers", "/dashboard"] }); }
