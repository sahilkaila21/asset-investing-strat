import { NextResponse } from "next/server";

const SAT = 100_000_000;
const MIN_BTC = 10;
const BASE = "https://mempool.space/api";

async function fetchJson(url: string) {
  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    // Get the 5 most recent confirmed blocks
    const blocks: { id: string; height: number; timestamp: number }[] =
      await fetchJson(`${BASE}/blocks`);

    const allTxs: {
      hash: string;
      time: number;
      inputCount: number;
      outputCount: number;
      outputSat: number;
      btc: number;
      blockHeight: number;
    }[] = [];

    // Fetch first page of transactions from each of the last 5 blocks
    await Promise.all(
      blocks.slice(0, 5).map(async (block) => {
        const txs: any[] = await fetchJson(`${BASE}/block/${block.id}/txs/0`);
        for (const tx of txs) {
          // Skip coinbase tx (first tx in a block — no real inputs)
          if (tx.vin?.[0]?.is_coinbase) continue;
          const outputSat: number = (tx.vout ?? []).reduce(
            (s: number, o: any) => s + (o.value ?? 0),
            0
          );
          const btc = outputSat / SAT;
          if (btc < MIN_BTC) continue;
          allTxs.push({
            hash: tx.txid,
            time: block.timestamp,
            inputCount: (tx.vin ?? []).length,
            outputCount: (tx.vout ?? []).length,
            outputSat,
            btc,
            blockHeight: block.height,
          });
        }
      })
    );

    const sorted = allTxs.sort((a, b) => b.outputSat - a.outputSat).slice(0, 25);
    return NextResponse.json(sorted);
  } catch (e: any) {
    console.error("Whale API error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
