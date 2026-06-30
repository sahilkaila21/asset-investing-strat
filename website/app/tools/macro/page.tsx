"use client";

type Widget = {
  symbol: string;
  title: string;
  description: string;
};

const widgets: Widget[] = [
  {
    symbol: "FRED:FEDFUNDS",
    title: "Fed Funds Rate",
    description: "US Federal Reserve interest rate — the primary lever for monetary tightening and easing.",
  },
  {
    symbol: "TVC:US10Y",
    title: "10Y Treasury Yield",
    description: "US 10-year bond yield — a proxy for inflation expectations and the risk-free rate that competes with crypto.",
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

function buildSrc(symbol: string) {
  const p = new URLSearchParams({
    symbol,
    interval: "M",
    theme: "dark",
    style: "3",
    locale: "en",
    toolbar_bg: "#161b27",
    backgroundColor: "rgba(15,17,23,1)",
    gridColor: "rgba(42,47,62,0.5)",
    hide_top_toolbar: "false",
    hide_legend: "false",
    save_image: "false",
    allow_symbol_change: "false",
    calendar: "false",
    hide_volume: "true",
  });
  return `https://www.tradingview.com/widgetembed/?${p.toString()}`;
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
        {widgets.map((w) => (
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
              <iframe
                src={buildSrc(w.symbol)}
                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                allowTransparency={true}
                frameBorder="0"
                scrolling="no"
                allow="clipboard-write"
              />
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
