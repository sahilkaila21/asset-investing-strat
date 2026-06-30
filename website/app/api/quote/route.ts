import { NextRequest, NextResponse } from "next/server";

const TICKERS: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  XRP: "XRP-USD",
  BNB: "BNB-USD",
  ADA: "ADA-USD",
  AVAX: "AVAX-USD",
  DOGE: "DOGE-USD",
};

export async function GET(request: NextRequest) {
  const coins = (request.nextUrl.searchParams.get("coins") ?? "BTC").toUpperCase().split(",");

  const results: Record<string, number> = {};

  await Promise.all(
    coins.map(async (coin) => {
      const ticker = TICKERS[coin];
      if (!ticker) return;

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        next: { revalidate: 60 }, // cache 1 min
      });

      if (!res.ok) return;
      const json = await res.json();
      const close = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (close) results[coin] = close;
    })
  );

  return NextResponse.json(results);
}
