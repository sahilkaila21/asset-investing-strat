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

  const allCandles: [number, number][] = []; // [timestamp_ms, close_price]
  let since = Math.floor(startTime / 1000); // Kraken uses Unix seconds
  const endSec = Math.floor(endTime / 1000);

  // Page through Kraken (max 720 candles per request) up to 10 pages
  for (let page = 0; page < 10; page++) {
    const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=1440&since=${since}`;
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });

    const json = await res.json();
    if (json.error?.length) return NextResponse.json({ error: json.error[0] }, { status: 502 });

    const resultKey = Object.keys(json.result).find((k) => k !== "last");
    if (!resultKey) break;

    const candles: string[][] = json.result[resultKey];
    let reachedEnd = false;

    for (const c of candles) {
      const ts = Number(c[0]);
      if (ts > endSec) { reachedEnd = true; break; }
      allCandles.push([ts * 1000, parseFloat(c[4])]);
    }

    if (reachedEnd || candles.length < 720) break;
    since = json.result.last;
  }

  return NextResponse.json(allCandles);
}
