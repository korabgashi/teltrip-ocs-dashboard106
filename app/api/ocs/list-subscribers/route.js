
import { NextResponse } from "next/server";
const API_URL = "https://ocs-api.esimvault.cloud/v1?token=HgljQn4Uhe6Ny07qTzYqPLjJ";

export async function POST(req){
  try{
    const { accountId } = await req.json();
    const body = { listSubscriber: { accountId: Number(accountId) || 3771 } };
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const text = await r.text();
    let json; try{ json = JSON.parse(text); } catch { json = { raw: text }; }

    // Normalize like your Python: listSubscriber.subscriberList
    const ls = json?.listSubscriber;
    const subs = Array.isArray(ls?.subscriberList) ? ls.subscriberList : [];
    return NextResponse.json({ listSubscriber: { subscriberList: subs }, _raw: json });
  }catch(e){
    return NextResponse.json({ error: String(e) }, { status: 200 });
  }
}
