import Link from "next/link";
import ToolCard from "@/components/ToolCard";
import { BarChart3, Thermometer, Globe, Calculator, Briefcase, Waves, Link2, RefreshCw, Zap } from "lucide-react";

const iconProps = { size: 22, color: "var(--blue)", strokeWidth: 1.75 };

const tools = [
  {
    href: "/tools/risk-model",
    icon: <BarChart3 {...iconProps} />,
    label: "Risk Model",
    tag: "Live",
    tagColor: "var(--green)",
    description:
      "13-factor risk score combining on-chain data, market sentiment, and macro signals. A weekly, published signal for BTC, ETH, SOL and more — built to support disciplined capital preservation, not to chase trades.",
    features: ["MVRV · Puell Multiple · Network Health", "Fear & Greed · Funding Rate · BTC Dominance", "Fed Funds · CPI · DXY"],
  },
  {
    href: "/tools/fear-greed",
    icon: <Thermometer {...iconProps} />,
    label: "Fear & Greed",
    tag: "Live",
    tagColor: "var(--green)",
    description:
      "Track crypto market sentiment on a 0–100 scale. Extreme readings, in either direction, are useful context for gauging when conditions are stretched.",
    features: ["Live score + gauge", "365-day history chart", "Yesterday · 1W · 1M snapshots"],
  },
  {
    href: "/tools/macro",
    icon: <Globe {...iconProps} />,
    label: "Macro Dashboard",
    tag: "Live",
    tagColor: "var(--green)",
    description:
      "Track the macro forces that drive crypto markets — interest rates, inflation, dollar strength, and global liquidity in one view.",
    features: ["Fed Funds Rate & CPI trends", "DXY & dollar strength", "Bitcoin price context"],
  },
  {
    href: "/tools/dca-calculator",
    icon: <Calculator {...iconProps} />,
    label: "DCA Calculator",
    tag: "Live",
    tagColor: "var(--green)",
    description:
      "See how a recurring investment would have performed. Pick an asset, amount, and start date — real historical prices, instant results.",
    features: ["BTC · ETH · SOL · XRP", "Weekly / biweekly / monthly", "Avg cost, ROI, P&L"],
  },
  {
    href: "/tools/portfolio",
    icon: <Briefcase {...iconProps} />,
    label: "Portfolio Tracker",
    tag: "Live",
    tagColor: "var(--green)",
    description:
      "Track your crypto holdings, cost basis, and P&L. Add assets, see live prices, and visualise your allocation — all stored locally in your browser.",
    features: ["Live prices · P&L · ROI", "Allocation donut chart", "BTC · ETH · SOL · XRP · BNB +more"],
  },
  {
    href: "/tools/whale-tracker",
    icon: <Waves {...iconProps} />,
    label: "Whale Tracker",
    tag: "Live",
    tagColor: "var(--green)",
    description:
      "Real-time feed of Bitcoin transfers of 10 BTC or more from confirmed blocks. Large on-chain movements are one input among many for reading market conditions.",
    features: ["Transactions ≥ 10 BTC", "USD value · size classification", "Live feed with tx links"],
  },
];

const comingSoonTools = [
  { href: "/tools/onchain", icon: Link2, label: "On-Chain Analytics" },
  { href: "/tools/altcoin-season", icon: RefreshCw, label: "Altcoin Season Index" },
  { href: "/tools/liquidation-map", icon: Zap, label: "Liquidation Heatmap" },
];

const stats = [
  { value: "13", label: "Risk Signals" },
  { value: "5+", label: "Asset Models" },
  { value: "10+", label: "Years Backtested" },
  { value: "Free", label: "To Use" },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px 60px" }}>
        <div style={{ maxWidth: 700 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              backgroundColor: "rgba(79,124,255,0.12)",
              border: "1px solid rgba(79,124,255,0.3)",
              borderRadius: 999,
              fontSize: "0.8rem",
              color: "var(--blue)",
              fontWeight: 600,
              marginBottom: 24,
              letterSpacing: "0.03em",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "var(--green)", display: "inline-block" }} />
            Risk Model is live
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: 20,
            }}
          >
            Know when to preserve capital,{" "}
            <span style={{ color: "var(--blue)" }}>and when the odds favor you</span>
          </h1>

          <p style={{ fontSize: "1.1rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 560, marginBottom: 36 }}>
            A disciplined, risk-managed approach to crypto investing — combining on-chain data, market
            sentiment, and macro signals into a single published weekly signal.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/tools/risk-model"
              style={{
                padding: "12px 28px",
                backgroundColor: "var(--blue)",
                color: "#fff",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: "0.95rem",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Open Risk Model →
            </Link>
            <a
              href="#tools"
              style={{
                padding: "12px 28px",
                backgroundColor: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "0.95rem",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              View All Tools
            </a>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 32, marginTop: 60, flexWrap: "wrap" }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--text)" }}>{s.value}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* Tools grid */}
      <section id="tools" style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
            Tools
          </div>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Everything you need in one place
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {tools.map((tool) => (
            <ToolCard key={tool.href} tool={tool} />
          ))}
        </div>

        <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: "0.8rem", color: "var(--muted)" }}>
          <span>In development:</span>
          {comingSoonTools.map((tool, i) => (
            <span key={tool.href} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {i > 0 && <span style={{ opacity: 0.5 }}>·</span>}
              <Link href={tool.href} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", textDecoration: "none" }}>
                <tool.icon size={14} strokeWidth={1.75} />
                {tool.label}
              </Link>
            </span>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* How it works */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
            How It Works
          </div>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Data-driven, not gut-driven
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 24 }}>
          {[
            { step: "01", title: "13 signals analyzed daily", desc: "On-chain (MVRV, Puell, Network Health), market sentiment, price structure, and macro data — all updated daily." },
            { step: "02", title: "Composite risk score 0–10", desc: "Each signal is weighted and normalized into a single risk score. Low = accumulate. High = reduce exposure." },
            { step: "03", title: "Weekly buy/sell signal", desc: "Every Sunday, the model outputs a clear action: how much to buy, or what % of holdings to sell." },
            { step: "04", title: "Backtest vs buy & hold", desc: "Compare risk-managed DCA against simple buy & hold across any date range with your own starting capital." },
          ].map((item) => (
            <div key={item.step} style={{ padding: "24px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--blue)", letterSpacing: "0.1em", marginBottom: 10 }}>{item.step}</div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 10 }}>{item.title}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section style={{ padding: "0 24px 80px" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "48px 40px",
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>See this week&apos;s signal, free.</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Open the Risk Model to see the current score, zone, and methodology — no card required.</p>
          </div>
          <Link
            href="/tools/risk-model"
            style={{
              padding: "13px 32px",
              backgroundColor: "var(--blue)",
              color: "#fff",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: "0.95rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Open Risk Model →
          </Link>
        </div>
      </section>
    </div>
  );
}
