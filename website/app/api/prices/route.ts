import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");

  if (!symbol || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=1000`;
  const res = await fetch(url);

  if (!res.ok) {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
