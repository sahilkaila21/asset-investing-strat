export const metadata = {
  title: "Risk Model — AssetStrat",
  description: "13-factor crypto risk model with weekly buy/sell signals for BTC, ETH, SOL and more.",
};

const STREAMLIT_BASE = "https://sahilkaila21-asset-investing-strat-streamlit-app.streamlit.app";
const STREAMLIT_URL = `${STREAMLIT_BASE}?embed=true&embed_options=hide_toolbar,hide_footer,hide_colored_line`;

export default function RiskModelPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
      {/* Slim header bar */}
      <div
        style={{
          padding: "10px 24px",
          backgroundColor: "#161b27",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.1rem" }}>📊</span>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Risk Model</span>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              padding: "2px 9px",
              borderRadius: 999,
              backgroundColor: "rgba(52,211,153,0.12)",
              color: "var(--green)",
              border: "1px solid rgba(52,211,153,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Live
          </span>
        </div>
        <a
          href={STREAMLIT_BASE}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.8rem",
            color: "var(--muted)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Open full screen ↗
        </a>
      </div>

      {/* Streamlit iframe */}
      <iframe
        src={STREAMLIT_URL}
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          backgroundColor: "#0f1117",
        }}
        title="Crypto Risk Model"
        allow="fullscreen"
      />
    </div>
  );
}
