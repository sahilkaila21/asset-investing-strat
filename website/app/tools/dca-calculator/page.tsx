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

function DCACalculator() {
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
      const MS_PER_DAY = 86400000;
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
                Prices from Yahoo Finance · Past performance is not indicative of future results.
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

// ─────────────────────────────────────────────────────────────────────────────
// Math helpers for the risk model
// ─────────────────────────────────────────────────────────────────────────────

function rollingMean(arr: number[], window: number): number[] {
  return arr.map((_, i) => {
    if (i < window - 1) return NaN;
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += arr[j];
    return sum / window;
  });
}

function rollingStd(arr: number[], window: number): number[] {
  const means = rollingMean(arr, window);
  return arr.map((_, i) => {
    if (i < window - 1) return NaN;
    const mean = means[i];
    let variance = 0;
    for (let j = i - window + 1; j <= i; j++) {
      variance += (arr[j] - mean) ** 2;
    }
    // Sample std (ddof=1 like pandas)
    return Math.sqrt(variance / (window - 1));
  });
}

function rollingZscore(arr: number[], window: number): number[] {
  const means = rollingMean(arr, window);
  const stds = rollingStd(arr, window);
  return arr.map((v, i) => {
    if (isNaN(means[i]) || isNaN(stds[i]) || stds[i] === 0) return NaN;
    return (v - means[i]) / stds[i];
  });
}

function expandingMinMax100(arr: number[]): number[] {
  let min = Infinity;
  let max = -Infinity;
  return arr.map((v) => {
    if (!isNaN(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (isNaN(v) || min === max || !isFinite(min) || !isFinite(max)) return 50;
    const scaled = ((v - min) / (max - min)) * 100;
    return Math.min(100, Math.max(0, scaled));
  });
}

function wilderRSI(closes: number[], window: number = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length <= window) return result;

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Seed: simple average of first `window` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < window; i++) {
    const c = changes[i];
    if (c > 0) avgGain += c;
    else avgLoss += -c;
  }
  avgGain /= window;
  avgLoss /= window;

  // First valid RSI is at index `window` (price index window means change index window-1)
  result[window] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = window + 1; i < closes.length; i++) {
    const c = changes[i - 1];
    const gain = c > 0 ? c : 0;
    const loss = c < 0 ? -c : 0;
    avgGain = (avgGain * (window - 1) + gain) / window;
    avgLoss = (avgLoss * (window - 1) + loss) / window;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

function rollingMA(arr: number[], window: number): number[] {
  return rollingMean(arr, window);
}

// Target weights (13-factor model). Factors not yet available default to neutral (50).
// Available now: valuation(12), trend(8), structure(8), sentiment(6), fearGreed(12) → total 46
// Coming soon: MVRV(18), NetworkHealth(1), PuellMultiple(8), FundingRate(7),
//              BTCDominance(4), InterestRate(4), DXY(3), CPI(4)
const W_VALUATION  = 12;
const W_TREND      = 8;
const W_STRUCTURE  = 8;
const W_SENTIMENT  = 6;
const W_FEAR_GREED = 12;
const W_TOTAL_AVAILABLE = W_VALUATION + W_TREND + W_STRUCTURE + W_SENTIMENT + W_FEAR_GREED; // 46

function computeRiskScores(
  prices: [number, number][],
  fgByDay: Map<number, number> // dayKey (floor(ts_ms / 86400000)) → F&G value 0-100
): number[] {
  const closes = prices.map(([, p]) => p);
  const n = closes.length;
  const MS_PER_DAY = 86_400_000;

  // ── Factor 1: Valuation (w=12) ────────────────────────────────────────────
  const logPrice = closes.map((p) => Math.log(p));
  const valZscore = rollingZscore(logPrice, 365);
  const valRaw = valZscore.map((z) => (isNaN(z) ? NaN : -z));
  const valuation = expandingMinMax100(valRaw);

  // ── Factor 2: Trend (w=8) ─────────────────────────────────────────────────
  const rsi14 = wilderRSI(closes, 14);
  const ma20 = rollingMA(closes, 20);
  const ma200 = rollingMA(closes, 200);
  const trendRaw = closes.map((c, i) => {
    const rsiNorm = isNaN(rsi14[i]) ? NaN : rsi14[i] / 100;
    const vsMA20 = isNaN(ma20[i]) || ma20[i] === 0 ? NaN : c / ma20[i] - 1;
    const vsMA200 = isNaN(ma200[i]) || ma200[i] === 0 ? NaN : c / ma200[i] - 1;
    const vals = [rsiNorm, vsMA20, vsMA200].filter((v) => !isNaN(v!)) as number[];
    if (vals.length === 0) return NaN;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });
  const trend = expandingMinMax100(trendRaw);

  // ── Factor 3: Structure (w=8) ─────────────────────────────────────────────
  const dailyReturns = closes.map((c, i) => (i === 0 ? NaN : (c - closes[i - 1]) / closes[i - 1]));
  const vol30 = rollingStd(dailyReturns.slice(1), 30).map((v) => (isNaN(v) ? NaN : v * Math.sqrt(365)));
  const vol30Full = [NaN, ...vol30];
  const structureRawZ = rollingZscore(vol30Full, 365);
  const structureRaw = structureRawZ.map((z) => (isNaN(z) ? NaN : -z));
  const structureHealth = expandingMinMax100(structureRaw);
  const structure = structureHealth.map((v) => 100 - v);

  // ── Factor 4: Sentiment (w=6) ─────────────────────────────────────────────
  const ret30 = closes.map((c, i) => (i < 30 ? NaN : (c - closes[i - 30]) / closes[i - 30]));
  const sentimentRawZ = rollingZscore(ret30, 365);
  const sentiment = expandingMinMax100(sentimentRawZ);

  // ── Factor 5: Fear & Greed (w=12) ────────────────────────────────────────
  // Value 0=Extreme Fear (low risk), 100=Extreme Greed (high risk) — already 0-100 scale
  const fearGreed = prices.map(([ts]) => {
    const dayKey = Math.floor(ts / MS_PER_DAY);
    // Try exact day, then ±1 day
    return fgByDay.get(dayKey) ?? fgByDay.get(dayKey - 1) ?? fgByDay.get(dayKey + 1) ?? 50;
  });

  // ── Composite (normalized across available factors) ───────────────────────
  const riskScores = Array.from({ length: n }, (_, i) => {
    const raw = (
      W_VALUATION  * valuation[i] +
      W_TREND      * trend[i] +
      W_STRUCTURE  * structure[i] +
      W_SENTIMENT  * sentiment[i] +
      W_FEAR_GREED * fearGreed[i]
    ) / W_TOTAL_AVAILABLE;
    const score = raw / 10;
    return Math.min(10, Math.max(0, score));
  });

  return riskScores;
}

type DynamicDCAResult = {
  // Dynamic DCA
  dynTotalInvested: number;
  dynBtcHeld: number;
  dynPortfolioValue: number;
  dynRoi: number;
  dynBuysMade: number;
  dynAvgBuyPrice: number;
  dynSellSignals: number;
  dynTotalBtcSold: number;
  dynUsdFromSells: number;
  dynCashOnHand: number;
  dynNetPositionValue: number;
  // Normal DCA (weekly, same amount, same start date)
  normTotalInvested: number;
  normPortfolioValue: number;
  normRoi: number;
  normBuysMade: number;
  normAvgBuyPrice: number;
  // Shared
  currentPrice: number;
  startDateStr: string;
  shortHistory: boolean;
};

function DynamicDCA() {
  const [amount, setAmount] = useState("100");
  const [startDate, setStartDate] = useState("2021-01-01");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DynamicDCAResult | null>(null);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() - 7);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const calculate = useCallback(async () => {
    const investAmt = parseFloat(amount);
    if (!investAmt || investAmt <= 0) {
      setError("Enter a valid investment amount.");
      return;
    }
    const userStart = new Date(startDate + "T00:00:00Z");
    const now = new Date();
    if (userStart >= now) {
      setError("Start date must be in the past.");
      return;
    }

    // Fetch enough history for the risk model (365-day warmup)
    const warmupStart = new Date(userStart);
    warmupStart.setDate(warmupStart.getDate() - 365);
    const fetchStart = new Date(Math.max(warmupStart.getTime(), new Date("2015-01-01").getTime()));

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const MS_PER_DAY = 86400000;

      // Fetch prices and Fear & Greed in parallel
      const [priceRes, fgRes] = await Promise.all([
        fetch(`/api/prices?coin=BTC&startTime=${fetchStart.getTime()}&endTime=${now.getTime()}`),
        fetch("/api/fear-greed"),
      ]);

      if (!priceRes.ok) {
        const body = await priceRes.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${priceRes.status} — failed to fetch price data.`);
      }
      const prices: [number, number][] = await priceRes.json();
      if (!prices.length) throw new Error("No price data returned for this date range.");

      // Build Fear & Greed lookup map (dayKey → value 0-100)
      // Falls back gracefully if the API fails — missing days default to neutral (50) in computeRiskScores
      const fgByDay = new Map<number, number>();
      if (fgRes.ok) {
        const fgData: { value: string; timestamp: string }[] = await fgRes.json().catch(() => []);
        for (const entry of fgData) {
          const dayKey = Math.floor((Number(entry.timestamp) * 1000) / MS_PER_DAY);
          fgByDay.set(dayKey, Number(entry.value));
        }
      }

      // Sort by timestamp ascending
      prices.sort((a, b) => a[0] - b[0]);

      const currentPrice = prices[prices.length - 1][1];

      // Warn if < 365 days from user start to now
      const msFromStart = now.getTime() - userStart.getTime();
      const shortHistory = msFromStart < 365 * 86_400_000;

      // Compute risk scores using 5-factor model (valuation, trend, structure, sentiment, fear & greed)
      const riskScores = computeRiskScores(prices, fgByDay);

      // Find index where user simulation starts
      const userStartMs = userStart.getTime();
      const simStartIdx = prices.findIndex(([ts]) => ts >= userStartMs);
      if (simStartIdx === -1) throw new Error("No price data at or after start date.");

      // ── Dynamic DCA simulation ────────────────────────────────────────────
      let dynBtcHeld = 0;
      let dynTotalInvested = 0;
      let dynBuysMade = 0;
      let dynSumBuyPrice = 0; // sum of prices paid (for avg)
      let dynSumBtcBought = 0;
      let dynSellSignals = 0;
      let dynTotalBtcSold = 0;
      let dynUsdFromSells = 0;
      let dynCashOnHand = 0;

      for (let i = simStartIdx; i < prices.length; i++) {
        const score = riskScores[i];
        const price = prices[i][1];

        if (score < 3.5) {
          // BUY
          const btcBought = investAmt / price;
          dynBtcHeld += btcBought;
          dynTotalInvested += investAmt;
          dynBuysMade++;
          dynSumBuyPrice += price;
          dynSumBtcBought += btcBought;
        } else if (score > 6.0 && dynBtcHeld > 0) {
          // SELL ALL
          const usd = dynBtcHeld * price;
          dynUsdFromSells += usd;
          dynCashOnHand += usd;
          dynTotalBtcSold += dynBtcHeld;
          dynBtcHeld = 0;
          dynSellSignals++;
        }
      }

      const dynPortfolioValue = dynBtcHeld * currentPrice;
      const dynNetPositionValue = dynPortfolioValue + dynCashOnHand;
      const dynRoi = dynTotalInvested > 0 ? ((dynNetPositionValue - dynTotalInvested) / dynTotalInvested) * 100 : 0;
      const dynAvgBuyPrice = dynBuysMade > 0 ? dynSumBuyPrice / dynBuysMade : 0;

      // ── Normal DCA (weekly, same amount, same start) ──────────────────────
      const MS_PER_DAY = 86400000;
      const priceMap = new Map<number, number>(
        prices.map(([ts, p]) => [Math.floor(ts / MS_PER_DAY), p])
      );
      const sortedDays = [...priceMap.keys()].sort((a, b) => a - b);

      function closestPrice(targetDayKey: number): number {
        if (priceMap.has(targetDayKey)) return priceMap.get(targetDayKey)!;
        let best = sortedDays[0];
        let bestDiff = Math.abs(best - targetDayKey);
        for (const d of sortedDays) {
          const diff = Math.abs(d - targetDayKey);
          if (diff < bestDiff) { best = d; bestDiff = diff; }
          if (d > targetDayKey) break;
        }
        return priceMap.get(best)!;
      }

      let normTotalInvested = 0;
      let normBtcHeld = 0;
      let normBuysMade = 0;
      let normSumBuyPrice = 0;
      const weekMs = 7 * MS_PER_DAY;

      for (let ts = userStartMs; ts <= now.getTime(); ts += weekMs) {
        const dayKey = Math.floor(ts / MS_PER_DAY);
        const price = closestPrice(dayKey);
        if (!price) continue;
        normBtcHeld += investAmt / price;
        normTotalInvested += investAmt;
        normBuysMade++;
        normSumBuyPrice += price;
      }

      const normPortfolioValue = normBtcHeld * currentPrice;
      const normRoi = normTotalInvested > 0 ? ((normPortfolioValue - normTotalInvested) / normTotalInvested) * 100 : 0;
      const normAvgBuyPrice = normBuysMade > 0 ? normSumBuyPrice / normBuysMade : 0;

      setResult({
        dynTotalInvested,
        dynBtcHeld,
        dynPortfolioValue,
        dynRoi,
        dynBuysMade,
        dynAvgBuyPrice,
        dynSellSignals,
        dynTotalBtcSold,
        dynUsdFromSells,
        dynCashOnHand,
        dynNetPositionValue,
        normTotalInvested,
        normPortfolioValue,
        normRoi,
        normBuysMade,
        normAvgBuyPrice,
        currentPrice,
        startDateStr: startDate,
        shortHistory,
      });
    } catch (e: any) {
      setError(e.message || "Failed to compute. Try again.");
    } finally {
      setLoading(false);
    }
  }, [amount, startDate]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 64px" }}>
      {/* Section divider */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: 48 }} />

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
          Dynamic DCA
        </div>
        <h2
          style={{
            fontSize: "clamp(1.4rem, 2.5vw, 1.8rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 10,
          }}
        >
          Dynamic DCA — Risk-Based Strategy
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", maxWidth: 560 }}>
          Instead of buying on a fixed schedule, this strategy uses our risk model to buy BTC when
          risk score is below 3.5 and sell when it rises above 6.0. Currently uses 5 factors:
          valuation, trend, structure, sentiment, and Fear &amp; Greed — BTC only.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 380px) 1fr",
          gap: 28,
          alignItems: "start",
        }}
        className="dyn-dca-grid"
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
          {/* Asset — BTC only */}
          <div>
            <label style={labelStyle}>Asset</label>
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 7,
                border: "1px solid var(--blue)",
                backgroundColor: "rgba(79,124,255,0.12)",
                color: "var(--blue)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <span style={{ fontWeight: 700 }}>BTC</span>
              <span style={{ display: "block", fontSize: "0.75rem", marginTop: 1, color: "var(--muted)" }}>
                Bitcoin — risk model is BTC-specific
              </span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="dyn-amount" style={labelStyle}>Investment per buy signal (USD)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "0.9rem" }}>$</span>
              <input
                id="dyn-amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 26 }}
              />
            </div>
          </div>

          {/* Start date */}
          <div>
            <label htmlFor="dyn-start-date" style={labelStyle}>Start date</label>
            <input
              id="dyn-start-date"
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
            {loading ? "Computing risk model…" : "Run Simulation"}
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
              <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📊</div>
              <p style={{ fontSize: "0.9rem" }}>
                Set your parameters and hit <strong style={{ color: "var(--text)" }}>Run Simulation</strong> to see how the risk-based strategy compares to regular DCA.
              </p>
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Short history warning */}
              {result.shortHistory && (
                <div
                  style={{
                    backgroundColor: "rgba(251,191,36,0.1)",
                    border: "1px solid rgba(251,191,36,0.5)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    fontSize: "0.82rem",
                    color: "var(--text)",
                  }}
                >
                  ⚠️ Risk model needs at least 1 year of price history for reliable signals. Consider an earlier start date.
                </div>
              )}

              {/* Narrative */}
              <div
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "20px 24px",
                  fontSize: "0.88rem",
                  lineHeight: 1.6,
                  color: "var(--muted)",
                }}
              >
                Your dynamic strategy bought <strong style={{ color: "var(--text)" }}>{fmt(result.dynBtcHeld + result.dynTotalBtcSold, 4)} BTC</strong> across{" "}
                <strong style={{ color: "var(--text)" }}>{result.dynBuysMade}</strong> low-risk {result.dynBuysMade === 1 ? "day" : "days"} and sold everything{" "}
                <strong style={{ color: "var(--text)" }}>{result.dynSellSignals}</strong> {result.dynSellSignals === 1 ? "time" : "times"} during high-risk periods.
                Net result:{" "}
                <strong style={{ color: result.dynUsdFromSells > 0 ? "var(--green)" : "var(--text)" }}>
                  {fmtUsd(result.dynUsdFromSells)}
                </strong>{" "}
                in realized proceeds + <strong style={{ color: "var(--text)" }}>{fmtUsd(result.dynPortfolioValue)}</strong> current BTC value.
              </div>

              {/* Side-by-side comparison table */}
              <div
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    borderBottom: "1px solid var(--border)",
                    padding: "12px 18px",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Metric</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Normal DCA (weekly)</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Dynamic DCA</span>
                </div>
                {[
                  {
                    label: "Total Invested",
                    norm: fmtUsd(result.normTotalInvested),
                    dyn: fmtUsd(result.dynTotalInvested),
                  },
                  {
                    label: "Portfolio Value",
                    norm: fmtUsd(result.normPortfolioValue),
                    dyn: fmtUsd(result.dynNetPositionValue),
                    normHighlight: result.normRoi >= 0 ? "green" : "red",
                    dynHighlight: result.dynRoi >= 0 ? "green" : "red",
                  },
                  {
                    label: "Profit / Loss",
                    norm: `${result.normRoi >= 0 ? "+" : ""}${fmtUsd(result.normPortfolioValue - result.normTotalInvested)}`,
                    dyn: `${result.dynRoi >= 0 ? "+" : ""}${fmtUsd(result.dynNetPositionValue - result.dynTotalInvested)}`,
                    normHighlight: result.normRoi >= 0 ? "green" : "red",
                    dynHighlight: result.dynRoi >= 0 ? "green" : "red",
                  },
                  {
                    label: "ROI %",
                    norm: `${result.normRoi >= 0 ? "+" : ""}${fmt(result.normRoi, 1)}%`,
                    dyn: `${result.dynRoi >= 0 ? "+" : ""}${fmt(result.dynRoi, 1)}%`,
                    normHighlight: result.normRoi >= 0 ? "green" : "red",
                    dynHighlight: result.dynRoi >= 0 ? "green" : "red",
                  },
                  {
                    label: "Buys Made",
                    norm: String(result.normBuysMade),
                    dyn: String(result.dynBuysMade),
                  },
                  {
                    label: "Avg Buy Price",
                    norm: result.normAvgBuyPrice > 0 ? `$${fmt(result.normAvgBuyPrice)}` : "—",
                    dyn: result.dynAvgBuyPrice > 0 ? `$${fmt(result.dynAvgBuyPrice)}` : "—",
                  },
                ].map((row, idx) => (
                  <div
                    key={row.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      padding: "12px 18px",
                      gap: 8,
                      borderBottom: idx < 5 ? "1px solid var(--border)" : "none",
                      backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{row.label}</span>
                    <span
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: (row as any).normHighlight === "green" ? "var(--green)"
                          : (row as any).normHighlight === "red" ? "var(--red)"
                          : "var(--text)",
                      }}
                    >
                      {row.norm}
                    </span>
                    <span
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: (row as any).dynHighlight === "green" ? "var(--green)"
                          : (row as any).dynHighlight === "red" ? "var(--red)"
                          : "var(--blue)",
                      }}
                    >
                      {row.dyn}
                    </span>
                  </div>
                ))}
              </div>

              {/* Dynamic DCA additional stats */}
              <div>
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--muted)",
                    marginBottom: 12,
                  }}
                >
                  Dynamic DCA Details
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <StatCard label="Sell signals triggered" value={String(result.dynSellSignals)} />
                  <StatCard label="Total BTC sold" value={`${fmt(result.dynTotalBtcSold, 4)} BTC`} />
                  <StatCard label="USD received from sells" value={fmtUsd(result.dynUsdFromSells)} highlight={result.dynUsdFromSells > 0 ? "green" : undefined} />
                  <StatCard label="Current BTC held" value={`${fmt(result.dynBtcHeld, 4)} BTC`} />
                  <StatCard label="Cash on hand" value={fmtUsd(result.dynCashOnHand)} />
                  <StatCard label="Net position value" value={fmtUsd(result.dynNetPositionValue)} highlight={result.dynRoi >= 0 ? "green" : "red"} />
                </div>
              </div>

              <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
                Prices from Yahoo Finance · Risk model computed client-side · Past performance is not indicative of future results.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dyn-dca-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function DCAPage() {
  return (
    <>
      <DCACalculator />
      <DynamicDCA />
    </>
  );
}
