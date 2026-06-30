import { NextRequest, NextResponse } from "next/server";

// CryptoCompare symbols
const CC_SYMBOLS: Record<string, string> = {
  BTC: "BTC",
  ETH: "ETH",
  SOL: "SOL",
  XRP: "XRP",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = (searchParams.get("coin") ?? "BTC").toUpperCase();
  const startTime = Number(searchParams.get("startTime")); // ms
  const endTime = Number(searchParams.get("endTime"));     // ms

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const sym = CC_SYMBOLS[coin];
  if (!sym) {
    return NextResponse.json({ error: "Unsupported coin" }, { status: 400 });
  }

  // CryptoCompare returns up to 2000 daily candles ending at `toTs` (Unix seconds).
  // Page backwards from endTime until we've covered startTime.
  const allCandles: [number, number][] = [];
  const startSec = Math.floor(startTime / 1000);
  let toTs = Math.floor(endTime / 1000);

  for (let page = 0; page < 10; page++) {
    const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${sym}&tsym=USD&limit=2000&toTs=${toTs}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      return NextResponse.json({ error: `CryptoCompare error ${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    if (json.Response !== "Success") {
      return NextResponse.json({ error: json.Message ?? "CryptoCompare error" }, { status: 502 });
    }

    const candles: { time: number; close: number }[] = json.Data.Data;

    // Prepend candles that fall within our range
    for (const c of candles) {
      if (c.time >= startSec && c.time <= Math.floor(endTime / 1000)) {
        allCandles.push([c.time * 1000, c.close]);
      }
    }

    // Stop if this page reaches back before our start date
    const pageStart: number = json.Data.TimeFrom;
    if (pageStart <= startSec) break;

    // Continue backwards: next page ends just before this page started
    toTs = pageStart - 1;
  }

  // Sort ascending
  allCandles.sort((a, b) => a[0] - b[0]);

  return NextResponse.json(allCandles);
}
