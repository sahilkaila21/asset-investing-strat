"use client";

import { useEffect, useRef } from "react";

type Widget = {
  symbol: string;
  title: string;
  description: string;
};

const widgets: Widget[] = [
  {
    symbol: "ECONOMICS:USINTR",
    title: "Fed Funds Rate",
    description: "US Federal Reserve interest rate — the primary lever for monetary tightening and easing.",
  },
  {
    symbol: "ECONOMICS:USIRYY",
    title: "CPI Inflation (YoY)",
    description: "US Consumer Price Index year-over-year change — the key inflation metric the Fed targets.",
  },
  {
    symbol: "TVC:DXY",
    title: "US Dollar Index (DXY)",
    description: "Strength of the dollar vs. a basket of currencies. A rising DXY typically pressures crypto.",
  },
  {
    symbol: "BITSTAMP:BTCUSD",
    title: "Bitcoin Price",
    description: "BTC/USD — context for how macro forces are currently affecting crypto markets.",
  },
];

function TradingViewChart({ symbol, id }: { symbol: string; id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView === "undefined") return;
      new (window as any).TradingView.widget({
        autosize: true,
        symbol,
        interval: "M",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "3",
        locale: "en",
        toolbar_bg: "#161b27",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: id,
        backgroundColor: "#0f1117",
        gridColor: "rgba(42,47,62,0.5)",
        hide_side_toolbar: true,
        allow_symbol_change: false,
      });
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [symbol, id]);

  return <div id={id} ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}

export default function MacroDashboard() {
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
          Macro Dashboard
        </div>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 10,
          }}
        >
          The forces driving crypto markets
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", maxWidth: 560 }}>
          Interest rates, inflation, dollar strength, and Bitcoin price — the four macro indicators
          that matter most for crypto market cycles.
        </p>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(540px, 1fr))",
          gap: 24,
        }}
      >
        {widgets.map((w, i) => (
          <div
            key={w.symbol}
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px 14px" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>{w.title}</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5 }}>{w.description}</p>
            </div>
            <div style={{ height: 300, borderTop: "1px solid var(--border)" }}>
              <TradingViewChart symbol={w.symbol} id={`tv-widget-${i}`} />
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 32, fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
        Charts powered by TradingView · Data is for informational purposes only, not financial advice.
      </p>
    </div>
  );
}
