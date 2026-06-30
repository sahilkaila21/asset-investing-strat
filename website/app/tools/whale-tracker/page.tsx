"use client";

import { useEffect, useState } from "react";

type WhaleTx = {
  hash: string;
  time: number;
  inputCount: number;
  outputCount: number;
  outputSat: number;
  btc: number;
  blockHeight: number;
};

function fmtBtc(btc: number) {
  return btc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtUsd(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function timeAgo(unixSec: number) {
  const diff = Math.floor(Date.now() / 1000 - unixSec);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function sizeLabel(btc: number) {
  if (btc >= 1000) return { label: "Mega Whale", color: "#34d399" };
  if (btc >= 100)  return { label: "Whale",      color: "#4f7cff" };
  if (btc >= 50)   return { label: "Large",      color: "#facc15" };
  return               { label: "Big Fish",    color: "#fb923c" };
}

export default function WhaleTracker() {
  const [txs, setTxs] = useState<WhaleTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/whales");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setTxs(data);
      setUpdatedAt(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalBtc = txs.reduce((s, t) => s + t.btc, 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
            Whale Tracker
          </div>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Large BTC transactions
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", maxWidth: 500 }}>
            Feed of Bitcoin transfers ≥ 10 BTC from recent confirmed blocks. Large movements often precede price action — watch where the money flows.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {updatedAt && !loading && (
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Updated {updatedAt.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: "7px 16px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, color: loading ? "var(--muted)" : "var(--text)", fontSize: "0.8rem", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid var(--red)", borderRadius: 8, padding: "14px 20px", color: "var(--red)", marginBottom: 24, fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {!loading && !error && txs.length > 0 && (
        <>
          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Transactions shown", value: txs.length.toString() },
              { label: "Total BTC moved", value: `${fmtBtc(totalBtc)} BTC` },
              { label: "Source", value: "Mempool.space" },
              { label: "Threshold", value: "≥ 10 BTC" },
            ].map((s) => (
              <div key={s.label} style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px" }}>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
                <p style={{ fontSize: "1rem", fontWeight: 700 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Transaction table */}
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Size", "Amount (BTC)", "Inputs → Outputs", "Block", "Time", "Tx Hash"].map((h) => (
                      <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx) => {
                    const size = sizeLabel(tx.btc);
                    return (
                      <tr key={tx.hash} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "13px 18px" }}>
                          <span style={{
                            fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                            backgroundColor: `${size.color}18`, color: size.color, whiteSpace: "nowrap",
                            border: `1px solid ${size.color}44`,
                          }}>
                            {size.label}
                          </span>
                        </td>
                        <td style={{ padding: "13px 18px", fontWeight: 700, fontSize: "0.9rem" }}>
                          {fmtBtc(tx.btc)} BTC
                        </td>
                        <td style={{ padding: "13px 18px", fontSize: "0.85rem", color: "var(--muted)" }}>
                          {tx.inputCount} → {tx.outputCount}
                        </td>
                        <td style={{ padding: "13px 18px", fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                          #{tx.blockHeight.toLocaleString()}
                        </td>
                        <td style={{ padding: "13px 18px", fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {timeAgo(tx.time)}
                        </td>
                        <td style={{ padding: "13px 18px" }}>
                          <a
                            href={`https://mempool.space/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.78rem", color: "var(--blue)", textDecoration: "none", fontFamily: "monospace" }}
                          >
                            {tx.hash.slice(0, 12)}…
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ marginTop: 20, fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
            Confirmed block data from Mempool.space · Refreshed every 2 min · Transactions ≥ 10 BTC · Not financial advice.
          </p>
        </>
      )}

      {!loading && !error && txs.length === 0 && (
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "60px 32px", textAlign: "center", color: "var(--muted)" }}>
          No transactions ≥ 10 BTC found in the last 5 blocks. Try refreshing.
        </div>
      )}

      {loading && (
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "60px 32px", textAlign: "center", color: "var(--muted)" }}>
          Fetching whale transactions…
        </div>
      )}
    </div>
  );
}
