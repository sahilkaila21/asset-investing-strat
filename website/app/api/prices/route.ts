import { NextRequest, NextResponse } from "next/server";

const COINCAP_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
};

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = (searchParams.get("coin") ?? "BTC").toUpperCase();
  const startTime = Number(searchParams.get("startTime")); // ms
  const endTime = Number(searchParams.get("endTime"));     // ms

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const assetId = COINCAP_IDS[coin];
  if (!assetId) {
    return NextResponse.json({ error: "Unsupported coin" }, { status: 400 });
  }

  // CoinCap returns all daily candles in a range — fetch year by year to stay within limits
  const allCandles: [number, number][] = [];
  let chunkStart = startTime;

  while (chunkStart < endTime) {
    const chunkEnd = Math.min(chunkStart + MS_PER_YEAR, endTime);
    const url = `https://api.coincap.io/v2/assets/${assetId}/history?interval=d1&start=${chunkStart}&end=${chunkEnd}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }

    const json = await res.json();
    const points: { time: number; priceUsd: string }[] = json.data ?? [];

    for (const p of points) {
      allCandles.push([p.time, parseFloat(p.priceUsd)]);
    }

    chunkStart = chunkEnd + 1;
  }

  // Deduplicate and sort by timestamp
  const seen = new Set<number>();
  const unique = allCandles
    .filter(([ts]) => {
      const key = Math.floor(ts / 86_400_000);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a[0] - b[0]);

  return NextResponse.json(unique);
}
