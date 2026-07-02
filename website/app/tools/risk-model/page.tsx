import Link from "next/link";
import data from "@/lib/risk-model-data.json";

export const metadata = {
  title: "Risk Model — Alphabit",
  description:
    "Alphabit's 13-factor BTC risk score (0–10) with a weekly accumulate / hold / reduce signal. Published methodology, updated regularly.",
};

type Factor = {
  key: string;
  name: string;
  tier: string;
  source: string;
  value: number;
  weight: number;
  contribution: number;
};

const ZONE_COLORS: Record<string, string> = {
  green: "var(--green)",
  amber: "#facc15",
  red: "var(--red)",
};

const TIER_ORDER = ["Valuation core", "Sentiment & momentum", "Macro & context"];

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Semicircle gauge for a 0–10 score. */
function Gauge({ score, color }: { score: number; color: string }) {
  const r = 80;
  const cx = 100;
  const cy = 100;
  const frac = Math.max(0, Math.min(1, score / 10));
  const angle = frac * 180 - 90;

  function pt(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  const start = pt(-90);
  const end = pt(angle);
  const largeArc = frac > 0.5 ? 1 : 0;

  return (
    <svg viewBox="0 0 200 116" style={{ width: "100%", maxWidth: 260 }}>
      <path d={`M 20 100 A ${r} ${r} 0 0 1 180 100`} fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" />
      {frac > 0 && (
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      )}
      <text x="100" y="86" textAnchor="middle" style={{ fill: "var(--text)", fontSize: "34px", fontWeight: 800 }}>
        {score.toFixed(1)}
      </text>
      <text x="100" y="104" textAnchor="middle" style={{ fill: "var(--muted)", fontSize: "11px", letterSpacing: "0.05em" }}>
        / 10 RISK
      </text>
    </svg>
  );
}

/** SVG line chart of weekly composite score, with zone bands + 3/6 thresholds. */
function HistoryChart({ history }: { history: { date: string; score: number }[] }) {
  const W = 820;
  const H = 240;
  const n = history.length;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (s: number) => H - (s / 10) * H;
  const line = history.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.score).toFixed(1)}`).join(" ");

  // year gridlines
  const years: { i: number; label: string }[] = [];
  let lastYear = "";
  history.forEach((d, i) => {
    const yr = d.date.slice(0, 4);
    if (yr !== lastYear) {
      years.push({ i, label: yr });
      lastYear = yr;
    }
  });

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: "100%" }} preserveAspectRatio="none">
      {/* zone bands */}
      <rect x="0" y={y(3)} width={W} height={H - y(3)} fill="var(--green)" opacity="0.06" />
      <rect x="0" y={y(6)} width={W} height={y(3) - y(6)} fill="#facc15" opacity="0.05" />
      <rect x="0" y="0" width={W} height={y(6)} fill="var(--red)" opacity="0.06" />
      {/* threshold lines */}
      {[3, 6].map((t) => (
        <g key={t}>
          <line x1="0" y1={y(t)} x2={W} y2={y(t)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          <text x="6" y={y(t) - 4} style={{ fill: "var(--muted)", fontSize: "11px" }}>{t}</text>
        </g>
      ))}
      {/* year ticks */}
      {years.map((yr) => (
        <text key={yr.label} x={x(yr.i)} y={H + 18} textAnchor="middle" style={{ fill: "var(--muted)", fontSize: "11px" }}>
          {yr.label}
        </text>
      ))}
      {/* score line */}
      <path d={line} fill="none" stroke="var(--blue)" strokeWidth="1.6" />
    </svg>
  );
}

function ValueBar({ value }: { value: number }) {
  return (
    <div style={{ flex: 1, height: 6, backgroundColor: "var(--bg)", borderRadius: 3, overflow: "hidden", minWidth: 70 }}>
      <div style={{ width: `${value}%`, height: "100%", backgroundColor: value > 66 ? "var(--red)" : value > 33 ? "#facc15" : "var(--green)", borderRadius: 3 }} />
    </div>
  );
}

export default function RiskModelPage() {
  const d = data as {
    asset: string;
    modelVersion: string;
    asOf: string;
    score: number;
    zone: { key: string; label: string; color: string };
    factors: Factor[];
    history: { date: string; score: number }[];
    dataNotes: { feedsDefaulted: string[] };
  };
  const zoneColor = ZONE_COLORS[d.zone.color] ?? "var(--blue)";
  const zoneCopy: Record<string, string> = {
    accumulate: "Historically favorable conditions — the model leans toward deploying capital.",
    hold: "Neutral territory — no strong edge in either direction. Most weeks land here.",
    reduce: "Historically dangerous conditions — the model leans toward reducing exposure.",
  };
  const tiers = TIER_ORDER.map((t) => ({ tier: t, factors: d.factors.filter((f) => f.tier === t) }));

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 96px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
            Risk Model · {d.asset}
          </div>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            This week&apos;s risk signal
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "4px 10px", borderRadius: 999, backgroundColor: "rgba(52,211,153,0.12)", color: "var(--green)", border: "1px solid rgba(52,211,153,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Live
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 999, padding: "4px 10px" }}>
            Model v{d.modelVersion}
          </span>
        </div>
      </div>

      {/* Signal hero */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 300px) 1fr",
          gap: 28,
          alignItems: "center",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          borderTop: `3px solid ${zoneColor}`,
          padding: "28px 32px",
          marginTop: 20,
          marginBottom: 20,
        }}
        className="signal-hero"
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Gauge score={d.score} color={zoneColor} />
        </div>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }}>
            Current zone
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: zoneColor, marginBottom: 8 }}>{d.zone.label}</div>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 16, maxWidth: 460 }}>
            {zoneCopy[d.zone.key]}
          </p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: "0.8rem", color: "var(--muted)" }}>
            <span>As of <strong style={{ color: "var(--text)" }}>{fmtDate(d.asOf)}</strong></span>
            <span>Zones: <strong style={{ color: "var(--green)" }}>accumulate &lt;3</strong> · <strong style={{ color: "#facc15" }}>hold 3–6</strong> · <strong style={{ color: "var(--red)" }}>reduce &gt;6</strong></span>
          </div>
        </div>
      </section>

      {/* Disclaimer strip */}
      <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 40 }}>
        A risk statement about position sizing, not a price prediction or a directive to trade. Updated regularly from on-chain,
        price, sentiment, and macro data.{" "}
        <Link href="/methodology" style={{ color: "var(--blue)", textDecoration: "none" }}>See the full methodology →</Link>
      </p>

      {/* History */}
      <section style={{ marginBottom: 44 }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 4 }}>Risk score over time</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 18 }}>Weekly composite, {d.history[0]?.date.slice(0, 4)}–present.</p>
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px 8px" }}>
          <HistoryChart history={d.history} />
        </div>
      </section>

      {/* Factor breakdown */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 4 }}>What&apos;s driving the score</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 18 }}>
          Each factor is normalized 0–100 (high = higher risk), then weighted. Contribution is the points each adds to the {d.score.toFixed(1)}.
        </p>
        {tiers.map(({ tier, factors }) => (
          <div key={tier} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>
              {tier}
            </div>
            <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {factors.map((f, i) => (
                <div
                  key={f.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(120px, 1.4fr) minmax(90px, 1fr) 56px 64px",
                    gap: 14,
                    alignItems: "center",
                    padding: "12px 18px",
                    borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  }}
                  className="factor-row"
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{f.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{f.source}</div>
                  </div>
                  <ValueBar value={f.value} />
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", textAlign: "right", fontFamily: "monospace" }}>{(f.weight * 100).toFixed(0)}%</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, textAlign: "right", fontFamily: "monospace" }}>+{f.contribution.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA / footer */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <Link href="/methodology" style={{ padding: "12px 26px", backgroundColor: "var(--blue)", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>
          How the model works →
        </Link>
        <Link href="/pricing" style={{ padding: "12px 26px", backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}>
          Get full history &amp; alerts with Pro
        </Link>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
        Not financial advice. Backtested behavior is in-sample and illustrative — see the{" "}
        <Link href="/legal/disclosure" style={{ color: "var(--muted)", textDecoration: "underline" }}>disclosure</Link>.
      </p>

      <style>{`
        @media (max-width: 640px) {
          .signal-hero { grid-template-columns: 1fr !important; }
          .factor-row { grid-template-columns: 1fr 60px 52px !important; }
          .factor-row > :nth-child(2) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
