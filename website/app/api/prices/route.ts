import { NextRequest, NextResponse } from "next/server";

const KRAKEN_PAIRS: Record<string, string> = {
  BTC: "XBTUSD",
  ETH: "ETHUSD",
  SOL: "SOLUSD",
  XRP: "XRPUSD",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = (searchParams.get("coin") ?? "BTC").toUpperCase();
  const startTime = Number(searchParams.get("startTime")); // ms
  const endTime = Number(searchParams.get("endTime"));     // ms

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const pair = KRAKEN_PAIRS[coin];
  if (!pair) {
    return NextResponse.json({ error: "Unsupported coin" }, { status: 400 });
  }

  // Kraken returns max 720 daily candles per request; page through if needed
  const allCandles: [number, number][] = []; // [timestamp_ms, close_price]
  let since = Math.floor(startTime / 1000); // Kraken uses Unix seconds

  while (true) {
    const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=1440&since=${since}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }

    const json = await res.json();
    if (json.error?.length) {
      return NextResponse.json({ error: json.error[0] }, { status: 502 });
    }

    // Result key is the pair name (may differ from requested, e.g. XXBTZUSD)
    const resultKey = Object.keys(json.result).find((k) => k !== "last");
    if (!resultKey) break;

    const candles: string[][] = json.result[resultKey];
    for (const c of candles) {
      const ts = Number(c[0]) * 1000; // convert to ms
      if (ts > endTime) break;
      allCandles.push([ts, parseFloat(c[4])]);
    }

    // Kraken's `last` tells us where to continue; stop if we've passed endTime
    const last = json.result.last * 1000;
    if (last >= endTime || candles.length < 720) break;
    since = json.result.last;
  }

  return NextResponse.json(allCandles);
}
