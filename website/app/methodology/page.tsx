import Link from "next/link";

export const metadata = {
  title: "Methodology — Alphabit",
  description:
    "Every factor, weight, and data source behind Alphabit's 13-factor crypto risk model — published in full.",
};

type Factor = {
  name: string;
  weight: number;
  source: string;
  reads: string;
  why: string;
};

const FACTOR_GROUPS: { group: string; blurb: string; factors: Factor[] }[] = [
  {
    group: "Tier 1 — Valuation core (56%)",
    blurb: "The factors that most reliably discriminate cycle tops from bottoms in historical testing. These carry the majority of the weight.",
    factors: [
      {
        name: "MVRV Ratio",
        weight: 0.16,
        source: "CoinMetrics",
        reads: "Market cap vs. realized cap (aggregate cost basis)",
        why: "When price runs far above what holders collectively paid, historically more of them take profit. The single largest weight, and the strongest single discriminator of bottoms.",
      },
      {
        name: "Valuation",
        weight: 0.12,
        source: "Exchange price history",
        reads: "Log-price z-score over a rolling 365 days",
        why: "How stretched price is relative to its own recent history. Crude but robust — it doesn't depend on any external data feed.",
      },
      {
        name: "Pi-Cycle Top",
        weight: 0.12,
        source: "Exchange price history",
        reads: "111-day moving average vs. 2× the 350-day moving average",
        why: "Approaches and crosses 1 near major cycle tops. In our testing it was the strongest top-caller of any factor. Pure price, no external feed.",
      },
      {
        name: "Puell Multiple",
        weight: 0.08,
        source: "CoinMetrics",
        reads: "Daily miner revenue (USD) vs. its 365-day average",
        why: "Extreme miner earnings have coincided with cycle tops; miner capitulation with bottoms. Only meaningful for proof-of-work assets.",
      },
      {
        name: "Mayer Multiple",
        weight: 0.08,
        source: "Exchange price history",
        reads: "Price relative to its 200-day moving average",
        why: "A simple, long-standing valuation gauge — readings far above the 200-day average have marked overextension. Pure price.",
      },
    ],
  },
  {
    group: "Tier 2 — Sentiment & momentum (24%)",
    blurb: "What the crowd is feeling and how price is behaving. Useful confirmation, secondary to valuation.",
    factors: [
      {
        name: "Fear & Greed Index",
        weight: 0.12,
        source: "alternative.me",
        reads: "Composite crowd-sentiment index, 0–100",
        why: "Extreme greed has historically been a better time to reduce than to add. Used as-is: greed maps to higher risk.",
      },
      {
        name: "Trend",
        weight: 0.08,
        source: "Exchange price history",
        reads: "RSI(14) + distance from 20-day and 200-day moving averages",
        why: "Overheated momentum — price far above both moving averages with high RSI — has historically preceded corrections.",
      },
      {
        name: "Sentiment (Momentum)",
        weight: 0.04,
        source: "Exchange price history",
        reads: "30-day return, z-scored over 365 days",
        why: "Very fast trailing gains tend to mean-revert. A small weight, since it overlaps partially with Trend.",
      },
    ],
  },
  {
    group: "Tier 3 — Macro & context (20%)",
    blurb: "The liquidity backdrop and structural context. These are weak cycle-timers on their own, so they are kept at low weight — present for context, not relied on to call turns.",
    factors: [
      {
        name: "BTC Dominance",
        weight: 0.05,
        source: "CoinMetrics",
        reads: "Bitcoin's share of BTC+ETH market cap (inverted)",
        why: "Falling dominance means capital rotating into more speculative assets — a late-cycle pattern. A soft signal, so it carries little weight.",
      },
      {
        name: "Structure (Volatility)",
        weight: 0.05,
        source: "Exchange price history",
        reads: "30-day realized volatility, annualized, z-scored",
        why: "Volatility expansions cluster around unstable regimes — but they spike at bottoms as well as tops, so it's context rather than a directional call.",
      },
      {
        name: "Network Health",
        weight: 0.04,
        source: "CoinMetrics",
        reads: "Hash rate + active addresses, averaged (inverted: healthy = lower risk)",
        why: "A network with rising security spend and real usage is structurally healthier. A slow-moving background factor, kept at low weight.",
      },
      {
        name: "US Dollar Index (DXY)",
        weight: 0.03,
        source: "Market data (DX-Y.NYB)",
        reads: "Dollar strength, z-scored over 365 days",
        why: "A strengthening dollar is generally a headwind for risk assets, but it's a loose, lagging relationship — hence a small context weight.",
      },
      {
        name: "CPI Inflation (YoY)",
        weight: 0.03,
        source: "FRED (CPIAUCSL)",
        reads: "Year-over-year change in US CPI",
        why: "Inflation pressures central-bank tightening, but its effect on crypto is slow and indirect — the smallest weight in the model.",
      },
    ],
  },
];

const totalWeight = FACTOR_GROUPS.flatMap((g) => g.factors).reduce((s, f) => s + f.weight, 0);

function WeightBar({ weight }: { weight: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, backgroundColor: "var(--bg)", borderRadius: 3, overflow: "hidden", minWidth: 60 }}>
        <div style={{ width: `${(weight / 0.16) * 100}%`, height: "100%", backgroundColor: "var(--blue)", borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, minWidth: 38, textAlign: "right" }}>
        {(weight * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px 96px" }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
          Methodology
        </div>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
          How the risk model works
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1.05rem", lineHeight: 1.7, maxWidth: 640 }}>
          The model combines 13 factors into a single risk score from 0 to 10. Every factor, its weight,
          and its data source is published below — the same numbers the model actually runs on. No black box.
        </p>
      </div>

      {/* How scoring works */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sectionHeading}>From raw data to one number</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {[
            {
              step: "1. Normalize",
              desc: "Each factor is converted to a 0–100 scale, most via a rolling 365-day z-score. 0 means historically low risk for that factor; 100 means historically high.",
            },
            {
              step: "2. Weight",
              desc: "Factors are combined as a weighted average using the published weights below. Weights sum to 100%.",
            },
            {
              step: "3. Score",
              desc: "The weighted result is divided by 10, giving a composite risk score from 0 (deep value conditions) to 10 (historically dangerous conditions).",
            },
          ].map((s) => (
            <div key={s.step} style={{ padding: 20, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 8, color: "var(--blue)" }}>{s.step}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6, marginTop: 16 }}>
          If an external data source is unavailable, that factor defaults to a neutral 50 rather than
          silently skewing the score. Weights are normalized so the composite always reflects the full set.
        </p>
      </section>

      {/* Factor tables */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sectionHeading}>
          The 13 factors{" "}
          <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "var(--muted)" }}>
            (weights sum to {(totalWeight * 100).toFixed(0)}%)
          </span>
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: 20, maxWidth: 660 }}>
          Grouped by conviction tier. Factors are weighted by how reliably they have discriminated
          cycle tops from bottoms in historical testing — the valuation core carries most of the weight,
          and macro sits at the bottom as context rather than a timing signal.
        </p>

        {FACTOR_GROUPS.map((group) => (
          <div key={group.group} style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>{group.group}</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 14 }}>{group.blurb}</p>
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {group.factors.map((f, i) => (
                <div
                  key={f.name}
                  style={{
                    padding: "16px 20px",
                    borderTop: i > 0 ? "1px solid var(--border)" : "none",
                    display: "grid",
                    gridTemplateColumns: "minmax(160px, 1fr) minmax(140px, 180px)",
                    gap: 16,
                    alignItems: "start",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{f.name}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {f.source}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 6 }}>
                      Measures: {f.reads}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.6, opacity: 0.9 }}>{f.why}</div>
                  </div>
                  <WeightBar weight={f.weight} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Zones */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sectionHeading}>How the score becomes a weekly signal</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: 16, maxWidth: 640 }}>
          The score updates as data arrives, and each Sunday it maps to one of three zones. The signal
          is always a risk statement about position sizing — never a price prediction.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { zone: "Accumulate", range: "Risk below 3", color: "var(--green)", desc: "Historically favorable conditions. The strategy scales its weekly buy size up as risk falls — buying most aggressively below 1." },
            { zone: "Hold", range: "Risk 3 – 6", color: "#facc15", desc: "Neutral territory. No buying, no selling — the strategy simply waits. Most weeks land here." },
            { zone: "Reduce", range: "Risk above 6", color: "var(--red)", desc: "Historically dangerous conditions. The strategy trims a growing fraction of the position (10% up to 50%) as risk climbs through tiers." },
          ].map((z) => (
            <div key={z.zone} style={{ padding: 20, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, borderTop: `3px solid ${z.color}` }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 2 }}>{z.zone}</div>
              <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: z.color, marginBottom: 10 }}>{z.range}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>{z.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Honesty section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sectionHeading}>Limitations, stated plainly</h2>
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 12, color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7 }}>
            <li>
              <strong style={{ color: "var(--text)" }}>The weights were informed by historical data.</strong>{" "}
              They were chosen by judgment and refined by looking at how the model behaved on past cycles —
              which means backtest results are in-sample and should be read as illustrative, not as a
              validated track record. We say this here because you&apos;d be right to ask.
            </li>
            <li>
              <strong style={{ color: "var(--text)" }}>Past regimes may not repeat.</strong> Every factor&apos;s
              usefulness rests on historical patterns (MVRV cycles, miner economics, macro tightening). A
              structurally new market can break any of them.
            </li>
            <li>
              <strong style={{ color: "var(--text)" }}>It under-flags leverage-driven tops.</strong> The model
              is built on valuation and on-chain conditions, so a top driven mainly by derivatives leverage or
              flows — rather than classic on-chain euphoria — reads as less extreme than it was. The November
              2021 high is the clearest example: the model registered it as elevated, not dangerous.
            </li>
            <li>
              <strong style={{ color: "var(--text)" }}>This is decision support, not advice.</strong> The model
              quantifies conditions; it doesn&apos;t know your situation, and it will be wrong on individual calls.
              The bet is that a disciplined process beats narrative and vibes over many decisions.
            </li>
            <li>
              <strong style={{ color: "var(--text)" }}>Methodology changes will be published.</strong> If a weight
              or factor changes, the change and the reasoning will be documented — the process is only
              trustworthy if you can watch it over time.
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/tools/risk-model"
          style={{ padding: "12px 28px", backgroundColor: "var(--blue)", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}
        >
          See the live signal →
        </Link>
        <Link
          href="/faq"
          style={{ padding: "12px 28px", backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, fontSize: "0.95rem", textDecoration: "none" }}
        >
          Read the FAQ
        </Link>
      </div>
    </div>
  );
}

const sectionHeading: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  letterSpacing: "-0.01em",
  marginBottom: 16,
};
