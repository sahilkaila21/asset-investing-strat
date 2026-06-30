import { NextResponse } from "next/server";

export async function GET() {
  // Blockchair: BTC transactions with output > 100 BTC (10,000,000,000 satoshis)
  const url =
    "https://api.blockchair.com/bitcoin/transactions" +
    "?q=output_total(10000000000..)&limit=25&s=time(desc)" +
    "&fields=hash,time,input_total,output_total,input_total_usd,output_total_usd,input_count,output_count,fee_usd";

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 600 }, // cache 10 minutes
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Blockchair error ${res.status}` }, { status: 502 });
  }

  const json = await res.json();
  return NextResponse.json(json.data ?? []);
}
