import { NextRequest, NextResponse } from "next/server";

const CG_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = (searchParams.get("coin") ?? "BTC").toUpperCase();
  const startTime = Number(searchParams.get("startTime")); // ms
  const endTime = Number(searchParams.get("endTime"));     // ms

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const id = CG_IDS[coin];
  if (!id) {
    return NextResponse.json({ error: "Unsupported coin" }, { status: 400 });
  }

  const from = Math.floor(startTime / 1000);
  const to = Math.floor(endTime / 1000);

  // CoinGecko market_chart/range: returns daily candles for ranges >90 days, no key needed
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 }, // cache 1 hour on Vercel
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("CoinGecko error", res.status, body);
    return NextResponse.json({ error: `Price API error ${res.status}` }, { status: 502 });
  }

  const json = await res.json();
  // CoinGecko returns { prices: [[timestamp_ms, price], ...] }
  const prices: [number, number][] = json.prices ?? [];

  return NextResponse.json(prices);
}
