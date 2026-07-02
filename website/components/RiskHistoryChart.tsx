"use client";

import { useRef, useState } from "react";

type Point = { date: string; score: number; price: number };

const W = 820;
const H = 240;

function fmtPrice(p: number) {
  if (p >= 1000) return `$${(p / 1000).toFixed(1)}K`;
  return `$${p.toFixed(0)}`;
}
function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function zoneOf(score: number) {
  if (score < 3) return { label: "Accumulate", color: "var(--green)" };
  if (score <= 6) return { label: "Hold", color: "#facc15" };
  return { label: "Reduce", color: "var(--red)" };
}

export default function RiskHistoryChart({ history }: { history: Point[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ i: number; px: number } | null>(null);
  const n = history.length;

  const prices = history.map((d) => d.price);
  const pMin = Math.min(...prices);
  const pMax = Math.max(...prices);
  const logMin = Math.log(pMin);
  const logMax = Math.log(pMax);

  const x = (i: number) => (i / (n - 1)) * W;
  const yRisk = (s: number) => H - (s / 10) * H;
  const yPrice = (p: number) => H - ((Math.log(p) - logMin) / (logMax - logMin)) * H;

  const riskLine = history.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yRisk(d.score).toFixed(1)}`).join(" ");
  const priceLine = history.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yPrice(d.price).toFixed(1)}`).join(" ");

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

  function onMove(clientX: number) {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const i = Math.round(frac * (n - 1));
    setHover({ i, px: frac * rect.width });
  }

  const hp = hover ? history[hover.i] : null;
  const hz = hp ? zoneOf(hp.score) : null;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H + 24}`}
        style={{ width: "100%", display: "block", touchAction: "none" }}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
      >
        {/* zone bands (risk axis) */}
        <rect x="0" y={yRisk(3)} width={W} height={H - yRisk(3)} fill="var(--green)" opacity="0.06" />
        <rect x="0" y={yRisk(6)} width={W} height={yRisk(3) - yRisk(6)} fill="#facc15" opacity="0.05" />
        <rect x="0" y="0" width={W} height={yRisk(6)} fill="var(--red)" opacity="0.06" />
        {/* thresholds */}
        {[3, 6].map((t) => (
          <g key={t}>
            <line x1="0" y1={yRisk(t)} x2={W} y2={yRisk(t)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="6" y={yRisk(t) - 4} style={{ fill: "var(--muted)", fontSize: "11px" }}>{t}</text>
          </g>
        ))}
        {/* year ticks */}
        {years.map((yr) => (
          <text key={yr.label} x={x(yr.i)} y={H + 18} textAnchor="middle" style={{ fill: "var(--muted)", fontSize: "11px" }}>
            {yr.label}
          </text>
        ))}
        {/* BTC price (log scale, subtle) */}
        <path d={priceLine} fill="none" stroke="#fb923c" strokeWidth="1.3" opacity="0.55" />
        {/* risk score */}
        <path d={riskLine} fill="none" stroke="var(--blue)" strokeWidth="1.7" />
        {/* hover crosshair + dots */}
        {hp && (
          <g>
            <line x1={x(hover!.i)} y1="0" x2={x(hover!.i)} y2={H} stroke="var(--text)" strokeWidth="1" opacity="0.35" />
            <circle cx={x(hover!.i)} cy={yPrice(hp.price)} r="3.5" fill="#fb923c" />
            <circle cx={x(hover!.i)} cy={yRisk(hp.score)} r="4" fill="var(--blue)" stroke="var(--bg)" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* legend */}
      <div style={{ display: "flex", gap: 18, fontSize: "0.75rem", color: "var(--muted)", marginTop: 4, paddingLeft: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2, background: "var(--blue)", display: "inline-block" }} /> Risk score (left, 0–10)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2, background: "#fb923c", display: "inline-block", opacity: 0.7 }} /> BTC price (log)
        </span>
      </div>

      {/* tooltip */}
      {hp && hz && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: Math.max(0, Math.min((wrapRef.current?.clientWidth ?? W) - 170, hover!.px + 12)),
            pointerEvents: "none",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: "0.78rem",
            minWidth: 150,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ color: "var(--muted)", marginBottom: 5 }}>{fmtDate(hp.date)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 3 }}>
            <span style={{ color: "var(--muted)" }}>Risk</span>
            <span style={{ fontWeight: 700 }}>
              {hp.score.toFixed(1)} <span style={{ color: hz.color, fontWeight: 600 }}>{hz.label}</span>
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "var(--muted)" }}>BTC</span>
            <span style={{ fontWeight: 700, color: "#fb923c" }}>{fmtPrice(hp.price)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
