"use client";

import { useEffect, useState, useCallback } from "react";
import { Briefcase } from "lucide-react";

type Coin = "BTC" | "ETH" | "SOL" | "XRP" | "BNB" | "ADA" | "AVAX" | "DOGE";

const COINS: { id: Coin; label: string; symbol: string }[] = [
  { id: "BTC",  label: "Bitcoin",   symbol: "BTC"  },
  { id: "ETH",  label: "Ethereum",  symbol: "ETH"  },
  { id: "SOL",  label: "Solana",    symbol: "SOL"  },
  { id: "XRP",  label: "XRP",       symbol: "XRP"  },
  { id: "BNB",  label: "BNB",       symbol: "BNB"  },
  { id: "ADA",  label: "Cardano",   symbol: "ADA"  },
  { id: "AVAX", label: "Avalanche", symbol: "AVAX" },
  { id: "DOGE", label: "Dogecoin",  symbol: "DOGE" },
];

type Holding = {
  id: string;
  coin: Coin;
  amount: number;
  avgCost: number; // USD per coin
};

const STORAGE_KEY = "assetstrat_portfolio";

function uid() {
  return Math.random().toString(36).slice(2);
}

function fmtUsd(n: number, decimals = 2) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

const COIN_COLORS: Record<string, string> = {
  BTC: "#f97316", ETH: "#8b5cf6", SOL: "#06b6d4", XRP: "#3b82f6",
  BNB: "#eab308", ADA: "#0ea5e9", AVAX: "#ef4444", DOGE: "#ca8a04",
};

// Simple SVG donut chart
function DonutChart({ slices }: { slices: { label: string; pct: number; color: string }[] }) {
  const R = 60; const CX = 80; const CY = 80;
  let cumAngle = -90;

  function arc(pct: number, color: string, idx: number) {
    if (pct <= 0) return null;
    const sweep = (pct / 100) * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    cumAngle += sweep;
    const endRad = (cumAngle * Math.PI) / 180;
    const x1 = CX + R * Math.cos(startRad);
    const y1 = CY + R * Math.sin(startRad);
    const x2 = CX + R * Math.cos(endRad);
    const y2 = CY + R * Math.sin(endRad);
    const large = sweep > 180 ? 1 : 0;
    return (
      <path
        key={idx}
        d={`M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={color}
        opacity={0.85}
      />
    );
  }

  return (
    <svg viewBox="0 0 160 160" style={{ width: 140, height: 140, flexShrink: 0 }}>
      {slices.map((s, i) => arc(s.pct, s.color, i))}
      <circle cx={CX} cy={CY} r={36} fill="var(--surface)" />
    </svg>
  );
}

export default function PortfolioTracker() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [formCoin, setFormCoin] = useState<Coin>("BTC");
  const [formAmount, setFormAmount] = useState("");
  const [formCost, setFormCost] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHoldings(JSON.parse(saved));
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  const fetchPrices = useCallback(async (coins: Coin[]) => {
    if (!coins.length) return;
    setPriceLoading(true);
    try {
      const res = await fetch(`/api/quote?coins=${coins.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        setPrices((prev) => ({ ...prev, ...data }));
        setLastUpdated(new Date());
      }
    } finally {
      setPriceLoading(false);
    }
  }, []);

  // Fetch prices whenever holdings change
  useEffect(() => {
    const coins = [...new Set(holdings.map((h) => h.coin))];
    if (coins.length) fetchPrices(coins);
  }, [holdings, fetchPrices]);

  function addHolding() {
    const amount = parseFloat(formAmount);
    const cost = parseFloat(formCost);
    if (!amount || amount <= 0 || !cost || cost <= 0) return;
    setHoldings((prev) => [...prev, { id: uid(), coin: formCoin, amount, avgCost: cost }]);
    setFormAmount("");
    setFormCost("");
    setShowForm(false);
  }

  function removeHolding(id: string) {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }

  // Aggregated per coin
  const aggregated = Object.values(
    holdings.reduce<Record<string, { coin: Coin; amount: number; invested: number }>>((acc, h) => {
      if (!acc[h.coin]) acc[h.coin] = { coin: h.coin, amount: 0, invested: 0 };
      acc[h.coin].amount += h.amount;
      acc[h.coin].invested += h.amount * h.avgCost;
      return acc;
    }, {})
  );

  const totalValue = aggregated.reduce((s, a) => s + a.amount * (prices[a.coin] ?? 0), 0);
  const totalInvested = aggregated.reduce((s, a) => s + a.invested, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const donutSlices = aggregated
    .filter((a) => prices[a.coin])
    .map((a) => ({
      label: a.coin,
      pct: totalValue > 0 ? ((a.amount * prices[a.coin]) / totalValue) * 100 : 0,
      color: COIN_COLORS[a.coin] ?? "var(--blue)",
    }));

  const isProfitable = totalPnl >= 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
            Portfolio Tracker
          </div>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Your holdings
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Stored locally in your browser · Add assets to track P&L and allocation.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {lastUpdated && (
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              {priceLoading ? "Refreshing…" : `Updated ${lastUpdated.toLocaleTimeString()}`}
            </span>
          )}
          <button
            onClick={() => fetchPrices([...new Set(holdings.map((h) => h.coin))])}
            disabled={priceLoading || !holdings.length}
            style={{ padding: "7px 14px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--muted)", fontSize: "0.8rem", cursor: "pointer" }}
          >
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: "7px 18px", backgroundColor: "var(--blue)", border: "none", borderRadius: 7, color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
          >
            + Add asset
          </button>
        </div>
      </div>

      {/* Add holding form */}
      {showForm && (
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: "0.95rem" }}>Add holding</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }} className="form-grid">
            <div>
              <label style={labelStyle}>Asset</label>
              <select
                value={formCoin}
                onChange={(e) => setFormCoin(e.target.value as Coin)}
                style={inputStyle}
              >
                {COINS.map((c) => (
                  <option key={c.id} value={c.id}>{c.symbol} — {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Amount (coins)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.5"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Avg buy price (USD)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="42000"
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={addHolding}
                style={{ padding: "10px 18px", backgroundColor: "var(--blue)", border: "none", borderRadius: 7, color: "#fff", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
              >
                Add
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: "10px 14px", backgroundColor: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {holdings.length === 0 ? (
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "60px 32px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Briefcase size={40} color="var(--muted)" strokeWidth={1.5} />
          </div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No holdings yet</p>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: 24 }}>Add your first asset to start tracking your portfolio.</p>
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: "10px 24px", backgroundColor: "var(--blue)", border: "none", borderRadius: 7, color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            + Add asset
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            <SummaryCard label="Total value" value={fmtUsd(totalValue)} />
            <SummaryCard label="Total invested" value={fmtUsd(totalInvested)} />
            <SummaryCard
              label="Total P&L"
              value={`${isProfitable ? "+" : ""}${fmtUsd(totalPnl)}`}
              color={isProfitable ? "var(--green)" : "var(--red)"}
            />
            <SummaryCard
              label="ROI"
              value={fmtPct(totalPnlPct)}
              color={isProfitable ? "var(--green)" : "var(--red)"}
            />
          </div>

          {/* Allocation + table */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }} className="main-grid">
            {/* Donut */}
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 16 }}>Allocation</p>
              <DonutChart slices={donutSlices} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {donutSlices.map((s) => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.color }} />
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{s.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Holdings table */}
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Asset", "Holdings", "Avg Cost", "Current Price", "Value", "P&L", ""].map((h) => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => {
                      const price = prices[h.coin];
                      const value = price ? h.amount * price : null;
                      const invested = h.amount * h.avgCost;
                      const pnl = value !== null ? value - invested : null;
                      const pnlPct = pnl !== null ? (pnl / invested) * 100 : null;
                      const coin = COINS.find((c) => c.id === h.coin)!;
                      const isPos = pnl !== null && pnl >= 0;

                      return (
                        <tr key={h.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COIN_COLORS[h.coin] ?? "var(--blue)", flexShrink: 0 }} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{coin.symbol}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{coin.label}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: "0.875rem" }}>
                            {h.amount.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: "0.875rem", color: "var(--muted)" }}>
                            {fmtUsd(h.avgCost)}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: "0.875rem" }}>
                            {price ? fmtUsd(price) : <span style={{ color: "var(--muted)" }}>—</span>}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: "0.875rem", fontWeight: 600 }}>
                            {value !== null ? fmtUsd(value) : <span style={{ color: "var(--muted)" }}>—</span>}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            {pnl !== null ? (
                              <div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: isPos ? "var(--green)" : "var(--red)" }}>
                                  {isPos ? "+" : ""}{fmtUsd(pnl)}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: isPos ? "var(--green)" : "var(--red)" }}>
                                  {fmtPct(pnlPct!)}
                                </div>
                              </div>
                            ) : <span style={{ color: "var(--muted)" }}>—</span>}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <button
                              onClick={() => removeHolding(h.id)}
                              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem", padding: "0 4px", lineHeight: 1 }}
                              title="Remove"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
            Prices from Yahoo Finance · Refreshed on load · Data stored in your browser only.
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .main-grid { grid-template-columns: 1fr !important; }
          .form-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 20px" }}>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: "1.15rem", fontWeight: 700, color: color ?? "var(--text)" }}>{value}</p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)",
  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", backgroundColor: "var(--bg)", border: "1px solid var(--border)",
  borderRadius: 7, color: "var(--text)", fontSize: "0.875rem", outline: "none", colorScheme: "dark",
};
