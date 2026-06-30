"use client";

import { useState, useCallback } from "react";

type Asset = "BTC" | "ETH" | "SOL" | "XRP";
type Frequency = "weekly" | "biweekly" | "monthly";

const ASSETS: { id: Asset; label: string; symbol: string }[] = [
  { id: "BTC", label: "Bitcoin", symbol: "BTC" },
  { id: "ETH", label: "Ethereum", symbol: "ETH" },
  { id: "SOL", label: "Solana", symbol: "SOL" },
  { id: "XRP", label: "XRP", symbol: "XRP" },
];

const FREQ_DAYS: Record<Frequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

type Result = {
  totalInvested: number;
  portfolioValue: number;
  totalCoins: number;
  avgCost: number;
  currentPrice: number;
  roi: number;
  purchases: number;
  bestPurchasePrice: number;
  worstPurchasePrice: number;
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${fmt(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${fmt(n / 1_000)}K`;
  return `$${fmt(n)}`;
}

export default function DCACalculator() {
  const [asset, setAsset] = useState<Asset>("BTC");
  const [amount, setAmount] = useState("100");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [startDate, setStartDate] = useState("2021-01-01");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() - 7);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const calculate = useCallback(async () => {
    const investAmt = parseFloat(amount);
    if (!investAmt || investAmt <= 0) {
      setError("Enter a valid investment amount.");
      return;
    }
    const start = new Date(startDate);
    const now = new Date();
    if (start >= now) {
      setError("Start date must be in the past.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const startMs = start.getTime();
      const endMs = now.getTime();
      const url = `/api/prices?coin=${asset}&startTime=${startMs}&endTime=${endMs}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status} — failed to fetch price data.`);
      }
      const prices: [number, number][] = await res.json();

      if (!prices.length) throw new Error("No price data returned for this date range.");

      // Build a map of day-key → close price for fast lookup
      const MS_PER_DAY = 86_400_000;
      const priceMap = new Map<number, number>(
        prices.map(([ts, price]) => [Math.floor(ts / MS_PER_DAY), price])
      );
      const sortedDays = [...priceMap.keys()].sort((a, b) => a - b);

      function closestPrice(targetDayKey: number): number {
        if (priceMap.has(targetDayKey)) return priceMap.get(targetDayKey)!;
        // Find nearest day with data
        let best = sortedDays[0];
        let bestDiff = Math.abs(best - targetDayKey);
        for (const d of sortedDays) {
          const diff = Math.abs(d - targetDayKey);
          if (diff < bestDiff) { best = d; bestDiff = diff; }
          if (d > targetDayKey) break;
        }
        return priceMap.get(best)!;
      }

      const intervalMs = FREQ_DAYS[frequency] * MS_PER_DAY;
      let totalCoins = 0;
      let totalInvested = 0;
      let purchases = 0;
      let bestPurchasePrice = Infinity;
      let worstPurchasePrice = 0;

      // Iterate by actual date so interval is always correct regardless of data gaps
      for (let ts = startMs; ts <= endMs; ts += intervalMs) {
        const dayKey = Math.floor(ts / MS_PER_DAY);
        const price = closestPrice(dayKey);
        if (!price) continue;
        totalCoins += investAmt / price;
        totalInvested += investAmt;
        purchases++;
        if (price < bestPurchasePrice) bestPurchasePrice = price;
        if (price > worstPurchasePrice) worstPurchasePrice = price;
      }

      const currentPrice = prices[prices.length - 1][1];
      const portfolioValue = totalCoins * currentPrice;
      const roi = ((portfolioValue - totalInvested) / totalInvested) * 100;
      const avgCost = totalInvested / totalCoins;

      setResult({
        totalInvested,
        portfolioValue,
        totalCoins,
        avgCost,
        currentPrice,
        roi,
        purchases,
        bestPurchasePrice,
        worstPurchasePrice,
      });
    } catch (e: any) {
      setError(e.message || "Failed to fetch price data. Try again.");
    } finally {
      setLoading(false);
    }
  }, [asset, amount, frequency, startDate]);

  const selectedAsset = ASSETS.find((a) => a.id === asset)!;
  const isProfit = result && result.roi >= 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--muted)",
            marginBottom: 10,
          }}
        >
          DCA Calculator
        </div>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 10,
          }}
        >
          What if you had DCA&apos;d?
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", maxWidth: 520 }}>
          See how a regular recurring investment would have performed. Pick an asset, amount,
          and start date — we&apos;ll crunch the numbers using real historical prices.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 420px) 1fr",
          gap: 28,
          alignItems: "start",
        }}
        className="dca-grid"
      >
        {/* Form */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Asset */}
          <div>
            <label style={labelStyle}>Asset</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ASSETS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAsset(a.id)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 7,
                    border: "1px solid",
                    borderColor: asset === a.id ? "var(--blue)" : "var(--border)",
                    backgroundColor: asset === a.id ? "rgba(79,124,255,0.12)" : "var(--bg)",
                    color: asset === a.id ? "var(--blue)" : "var(--muted)",
                    fontSize: "0.85rem",
                    fontWeight: asset === a.id ? 600 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{a.symbol}</span>
                  <span style={{ display: "block", fontSize: "0.75rem", marginTop: 1 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" style={labelStyle}>Investment per period (USD)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "0.9rem" }}>$</span>
              <input
                id="amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 26 }}
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label style={labelStyle}>Frequency</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["weekly", "biweekly", "monthly"] as Frequency[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  style={{
                    flex: 1,
                    padding: "9px 4px",
                    borderRadius: 7,
                    border: "1px solid",
                    borderColor: frequency === f ? "var(--blue)" : "var(--border)",
                    backgroundColor: frequency === f ? "rgba(79,124,255,0.12)" : "var(--bg)",
                    color: frequency === f ? "var(--blue)" : "var(--muted)",
                    fontSize: "0.8rem",
                    fontWeight: frequency === f ? 600 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Start date */}
          <div>
            <label htmlFor="start-date" style={labelStyle}>Start date</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              max={maxDateStr}
              min="2015-01-01"
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ color: "var(--red)", fontSize: "0.8rem", margin: 0 }}>{error}</p>
          )}

          <button
            onClick={calculate}
            disabled={loading}
            style={{
              padding: "12px",
              backgroundColor: loading ? "var(--border)" : "var(--blue)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Calculating…" : "Calculate"}
          </button>
        </div>

        {/* Results */}
        <div>
          {!result && !loading && (
            <div
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "48px 32px",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🧮</div>
              <p style={{ fontSize: "0.9rem" }}>
                Set your parameters and hit <strong style={{ color: "var(--text)" }}>Calculate</strong> to see how your DCA strategy would have performed.
              </p>
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* ROI banner */}
              <div
                style={{
                  backgroundColor: isProfit ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                  border: `1px solid ${isProfit ? "var(--green)" : "var(--red)"}`,
                  borderRadius: 12,
                  padding: "24px 28px",
                }}
              >
                <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 6 }}>
                  Total return on {result.purchases} {frequency} purchases of ${amount} in {selectedAsset.label}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span
                    style={{
                      fontSize: "2.8rem",
                      fontWeight: 800,
                      color: isProfit ? "var(--green)" : "var(--red)",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {isProfit ? "+" : ""}{fmt(result.roi, 1)}%
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>ROI</span>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <StatCard label="Total invested" value={fmtUsd(result.totalInvested)} />
                <StatCard
                  label="Portfolio value"
                  value={fmtUsd(result.portfolioValue)}
                  highlight={isProfit ? "green" : "red"}
                />
                <StatCard
                  label={`${selectedAsset.symbol} accumulated`}
                  value={`${fmt(result.totalCoins, 4)} ${selectedAsset.symbol}`}
                />
                <StatCard
                  label="Profit / Loss"
                  value={`${isProfit ? "+" : ""}${fmtUsd(result.portfolioValue - result.totalInvested)}`}
                  highlight={isProfit ? "green" : "red"}
                />
                <StatCard label="Avg cost basis" value={`$${fmt(result.avgCost)}`} />
                <StatCard label="Current price" value={`$${fmt(result.currentPrice)}`} />
                <StatCard label="Best buy price" value={`$${fmt(result.bestPurchasePrice)}`} />
                <StatCard label="Worst buy price" value={`$${fmt(result.worstPurchasePrice)}`} />
              </div>

              <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
                Prices from CoinGecko · Past performance is not indicative of future results.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dca-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "green" | "red";
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 4 }}>{label}</p>
      <p
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: highlight === "green" ? "var(--green)" : highlight === "red" ? "var(--red)" : "var(--text)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 7,
  color: "var(--text)",
  fontSize: "0.9rem",
  outline: "none",
  colorScheme: "dark",
};
