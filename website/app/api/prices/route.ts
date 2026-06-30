import { NextRequest, NextResponse } from "next/server";

const YF_TICKERS: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  XRP: "XRP-USD",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = (searchParams.get("coin") ?? "BTC").toUpperCase();
  const startTime = Number(searchParams.get("startTime")); // ms
  const endTime = Number(searchParams.get("endTime"));     // ms

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const ticker = YF_TICKERS[coin];
  if (!ticker) {
    return NextResponse.json({ error: "Unsupported coin" }, { status: 400 });
  }

  const period1 = Math.floor(startTime / 1000);
  const period2 = Math.floor(endTime / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Yahoo Finance error", res.status, body.slice(0, 300));
    return NextResponse.json({ error: `Price API error ${res.status}` }, { status: 502 });
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    return NextResponse.json({ error: "No data returned" }, { status: 502 });
  }

  const timestamps: number[] = result.timestamp ?? [];
  const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];

  // Return [timestamp_ms, close_price], skip any null closes
  const prices: [number, number][] = timestamps
    .map((ts, i) => [ts * 1000, closes[i]] as [number, number])
    .filter(([, price]) => price != null && !isNaN(price));

  return NextResponse.json(prices);
}
