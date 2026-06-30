import { NextResponse } from "next/server";

const SAT = 100_000_000;
const MIN_BTC = 50; // minimum 50 BTC to qualify as whale

export async function GET() {
  // Blockchain.com unconfirmed mempool transactions — free, no key
  const res = await fetch(
    "https://blockchain.info/unconfirmed-transactions?format=json",
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 }, // cache 2 minutes
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: `Blockchain.com error ${res.status}` }, { status: 502 });
  }

  const json = await res.json();
  const txs: any[] = json.txs ?? [];

  // Sum outputs per transaction and filter for whale-size
  const whales = txs
    .map((tx) => {
      const outputSat: number = (tx.out ?? []).reduce(
        (s: number, o: any) => s + (o.value ?? 0),
        0
      );
      return {
        hash: tx.hash as string,
        time: tx.time as number,        // unix seconds
        inputCount: (tx.inputs ?? []).length as number,
        outputCount: (tx.out ?? []).length as number,
        outputSat,
        btc: outputSat / SAT,
      };
    })
    .filter((tx) => tx.btc >= MIN_BTC)
    .sort((a, b) => b.outputSat - a.outputSat)
    .slice(0, 25);

  return NextResponse.json(whales);
}
