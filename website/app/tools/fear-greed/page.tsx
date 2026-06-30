"use client";

import { useEffect, useState } from "react";

type DataPoint = {
  value: string;
  value_classification: string;
  timestamp: string;
};

function getColor(val: number) {
  if (val <= 24) return "#f87171"; // extreme fear
  if (val <= 49) return "#fb923c"; // fear
  if (val <= 74) return "#facc15"; // greed
  return "#34d399";                // extreme greed
}

function getLabel(val: number) {
  if (val <= 24) return "Extreme Fear";
  if (val <= 49) return "Fear";
  if (val <= 74) return "Greed";
  return "Extreme Greed";
}

// SVG semicircle gauge
function Gauge({ value }: { value: number }) {
  const angle = (value / 100) * 180 - 90; // -90 (left) to +90 (right)
  const color = getColor(value);
  const r = 80;
  const cx = 100;
  const cy = 100;

  // Arc from left to current value
  function polarToCartesian(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const start = polarToCartesian(-90);
  const end = polarToCartesian(angle);
  const largeArc = value > 50 ? 1 : 0;

  return (
    <svg viewBox="0 0 200 110" style={{ width: "100%", maxWidth: 280 }}>
      {/* Background arc */}
      <path
        d={`M ${20} ${100} A ${r} ${r} 0 0 1 ${180} ${100}`}
        fill="none"
        stroke="var(--border)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Value arc */}
      {value > 0 && (
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
        />
      )}
      {/* Needle dot */}
      <circle cx={end.x} cy={end.y} r="6" fill={color} />
      {/* Labels */}
      <text x="18" y="118" fontSize="9" fill="var(--muted)" textAnchor="middle">0</text>
      <text x="100" y="24" fontSize="9" fill="var(--muted)" textAnchor="middle">50</text>
      <text x="182" y="118" fontSize="9" fill="var(--muted)" textAnchor="middle">100</text>
    </svg>
  );
}

// Minimal SVG line chart
function LineChart({ data }: { data: DataPoint[] }) {
  if (!data.length) return null;

  const sorted = [...data].reverse(); // oldest first
  const values = sorted.map((d) => Number(d.value));
  const W = 600;
  const H = 160;
  const PAD = { top: 10, right: 10, bottom: 24, left: 28 };

  const minV = 0;
  const maxV = 100;

  function xPx(i: number) {
    return PAD.left + (i / (sorted.length - 1)) * (W - PAD.left - PAD.right);
  }
  function yPx(v: number) {
    return PAD.top + (1 - (v - minV) / (maxV - minV)) * (H - PAD.top - PAD.bottom);
  }

  const polyline = values.map((v, i) => `${xPx(i)},${yPx(v)}`).join(" ");

  // Zone bands
  const zones = [
    { lo: 75, hi: 100, color: "rgba(52,211,153,0.08)" },
    { lo: 50, hi: 75,  color: "rgba(250,204,21,0.06)" },
    { lo: 25, hi: 50,  color: "rgba(251,146,60,0.08)" },
    { lo: 0,  hi: 25,  color: "rgba(248,113,113,0.1)" },
  ];

  // X-axis labels: show ~6 evenly spaced dates
  const labelCount = 6;
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (sorted.length - 1))
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
      {/* Zone bands */}
      {zones.map((z) => (
        <rect
          key={z.lo}
          x={PAD.left}
          y={yPx(z.hi)}
          width={W - PAD.left - PAD.right}
          height={yPx(z.lo) - yPx(z.hi)}
          fill={z.color}
        />
      ))}
      {/* Y grid lines */}
      {[25, 50, 75].map((v) => (
        <g key={v}>
          <line x1={PAD.left} y1={yPx(v)} x2={W - PAD.right} y2={yPx(v)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x={PAD.left - 4} y={yPx(v) + 3} fontSize="8" fill="var(--muted)" textAnchor="end">{v}</text>
        </g>
      ))}
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="var(--blue)" strokeWidth="1.5" />
      {/* X labels */}
      {labelIndices.map((idx) => {
        const d = new Date(Number(sorted[idx].timestamp) * 1000);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        return (
          <text key={idx} x={xPx(idx)} y={H - 4} fontSize="8" fill="var(--muted)" textAnchor="middle">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export default function FearGreedPage() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/fear-greed")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setData(d);
        else setError(d.error ?? "Failed to load data");
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const current = data[0] ? Number(data[0].value) : null;
  const yesterday = data[1] ? Number(data[1].value) : null;
  const weekAgo = data[7] ? Number(data[7].value) : null;
  const monthAgo = data[30] ? Number(data[30].value) : null;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
          Fear & Greed Index
        </div>
        <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 10 }}>
          Crypto market sentiment
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", maxWidth: 520 }}>
          Measures market emotion on a 0–100 scale. Extreme fear can signal a buying opportunity; extreme greed often precedes corrections.
        </p>
      </div>

      {loading && (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      )}

      {error && (
        <p style={{ color: "var(--red)" }}>{error}</p>
      )}

      {!loading && !error && current !== null && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Top row: gauge + snapshot cards */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start" }} className="fg-top">
            {/* Gauge card */}
            <div style={{
              backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
              padding: "28px 32px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 220,
            }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 16 }}>
                Today
              </p>
              <Gauge value={current} />
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <span style={{ fontSize: "2.8rem", fontWeight: 800, color: getColor(current), letterSpacing: "-0.03em" }}>
                  {current}
                </span>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: getColor(current), marginTop: 2 }}>
                  {getLabel(current)}
                </p>
              </div>
            </div>

            {/* Snapshot cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {[
                { label: "Yesterday", val: yesterday },
                { label: "1 week ago", val: weekAgo },
                { label: "1 month ago", val: monthAgo },
              ].map(({ label, val }) => val !== null && (
                <div key={label} style={{
                  backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
                  padding: "18px 20px",
                }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 8 }}>{label}</p>
                  <p style={{ fontSize: "1.6rem", fontWeight: 800, color: getColor(val), letterSpacing: "-0.02em" }}>{val}</p>
                  <p style={{ fontSize: "0.75rem", color: getColor(val), marginTop: 2 }}>{getLabel(val)}</p>
                </div>
              ))}

              {/* Zone legend */}
              <div style={{
                backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
                padding: "18px 20px", gridColumn: "span 1",
              }}>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 10 }}>Zones</p>
                {[
                  { range: "0–24", label: "Extreme Fear", color: "#f87171" },
                  { range: "25–49", label: "Fear", color: "#fb923c" },
                  { range: "50–74", label: "Greed", color: "#facc15" },
                  { range: "75–100", label: "Extreme Greed", color: "#34d399" },
                ].map((z) => (
                  <div key={z.range} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: z.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{z.range} · {z.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Historical chart */}
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 14px" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>365-day history</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Fear & Greed Index over the past year</p>
            </div>
            <div style={{ height: 180, borderTop: "1px solid var(--border)", padding: "8px 16px 0" }}>
              <LineChart data={data} />
            </div>
          </div>

          {/* Recent readings table */}
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 14px" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Recent readings</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderTop: "1px solid var(--border)" }}>
                    {["Date", "Score", "Sentiment"].map((h) => (
                      <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 14).map((d, i) => {
                    const val = Number(d.value);
                    return (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 24px", fontSize: "0.85rem", color: "var(--muted)" }}>
                          {new Date(Number(d.timestamp) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td style={{ padding: "10px 24px", fontWeight: 700, color: getColor(val) }}>{val}</td>
                        <td style={{ padding: "10px 24px", fontSize: "0.85rem", color: getColor(val) }}>{getLabel(val)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
            Data from alternative.me · Updated daily · Not financial advice.
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .fg-top { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
