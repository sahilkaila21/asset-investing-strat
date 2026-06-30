export const metadata = {
  title: "Risk Model — AssetStrat",
  description: "13-factor crypto risk model with weekly buy/sell signals for BTC, ETH, SOL and more.",
};

const STREAMLIT_BASE = "https://asset-investing-strat.streamlit.app";
const STREAMLIT_URL = `${STREAMLIT_BASE}?embed=true&embed_options=hide_toolbar&embed_options=hide_footer&embed_options=hide_colored_line`;

export default function RiskModelPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>

      {/* Tool header bar */}
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
          }}
        >
          Open full screen ↗
        </a>
      </div>

      {/* iframe wrapper — overlay covers the Streamlit branding at the bottom */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <iframe
          src={STREAMLIT_URL}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "calc(100% + 50px)", /* extend past container so footer is clipped */
            border: "none",
            backgroundColor: "#0f1117",
          }}
          title="Crypto Risk Model"
          allow="fullscreen"
        />
        {/* Mask strip that covers the Streamlit footer */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 50,
            backgroundColor: "#0f1117",
            zIndex: 10,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
