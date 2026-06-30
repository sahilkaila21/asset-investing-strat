from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "btc_mvp"))

import streamlit as st
import plotly.graph_objects as go
import pandas as pd

from data import load_asset_data, SUPPORTED_ASSETS
from factors import add_factors, add_risk_and_allocation
from backtest import build_overview, run_backtest, sell_fraction_for_risk, weekly_strategy_amount
from onchain import fetch_all

# ── Page config ───────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Crypto Risk Model",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    .stApp { background-color: #0f1117; color: #e8eaf0; }
    [data-testid="stSidebar"] { background-color: #161b27; border-right: 1px solid #2a2f3e; }
    [data-testid="stSidebar"] * { color: #c9d1e0 !important; }

    [data-testid="stMetric"] {
        background: #1c2133; border: 1px solid #2a2f3e;
        border-radius: 10px; padding: 16px 20px;
    }
    [data-testid="stMetricLabel"] { color: #8b92a5 !important; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; }
    [data-testid="stMetricValue"] { color: #e8eaf0 !important; font-size: 1.4rem; font-weight: 700; }

    .signal-banner { border-radius: 10px; padding: 20px 28px; margin-bottom: 24px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    .signal-buy  { background: #0d2818; border: 1.5px solid #1a7a40; }
    .signal-sell { background: #2a0d0d; border: 1.5px solid #a02020; }
    .signal-hold { background: #1a1d28; border: 1.5px solid #3a3f52; }

    .signal-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: #8b92a5; margin-bottom: 4px; }
    .signal-value { font-size: 1.5rem; font-weight: 800; }
    .signal-divider { width: 1px; height: 48px; background: #2a2f3e; }

    .buy-color  { color: #34d399; }
    .sell-color { color: #f87171; }
    .hold-color { color: #94a3b8; }

    .source-ok   { color: #34d399; font-size: 0.75rem; }
    .source-fail { color: #f87171; font-size: 0.75rem; }

    .section-header { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #5a6175; margin: 16px 0 6px 0; }

    [data-testid="stTabs"] button { color: #8b92a5 !important; font-weight: 500; }
    [data-testid="stTabs"] button[aria-selected="true"] { color: #e8eaf0 !important; border-bottom-color: #4f7cff !important; }

    hr { border-color: #2a2f3e !important; }
    #MainMenu { visibility: hidden; }
    footer { visibility: hidden; }
</style>
""", unsafe_allow_html=True)

# ── Cached data fetchers ──────────────────────────────────────────────────────

@st.cache_data(ttl=3600, show_spinner=False)
def get_price_data(ticker: str) -> pd.DataFrame:
    return load_asset_data(ticker)

@st.cache_data(ttl=14400, show_spinner=False)
def get_external_data(ticker: str) -> dict:
    return fetch_all(ticker)

# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("## 📈 Risk Model")

    st.markdown('<div class="section-header">Asset</div>', unsafe_allow_html=True)
    asset_label = st.selectbox("Select asset", options=list(SUPPORTED_ASSETS.keys()), label_visibility="collapsed")
    ticker = SUPPORTED_ASSETS[asset_label]
    asset_short = asset_label.split("(")[-1].replace(")", "").strip()

    st.divider()
    st.markdown('<div class="section-header">Factor Weights — Price</div>', unsafe_allow_html=True)
    st.caption("Sliders auto-normalize to 100%")
    w_mvrv         = st.slider("MVRV Score",      0, 100, 22, step=1, help="On-chain: market cap vs realized cap. Best BTC cycle indicator.")
    w_valuation    = st.slider("Valuation",        0, 100, 18, step=1, help="Z-score of log price over 365 days.")
    w_trend        = st.slider("Trend",            0, 100, 13, step=1, help="RSI-14, price vs MA-20, price vs MA-200.")
    w_structure    = st.slider("Structure",        0, 100, 10, step=1, help="Annualized 30-day volatility.")
    w_sentiment    = st.slider("Sentiment",        0, 100,  8, step=1, help="Z-score of 30-day price return.")

    st.markdown('<div class="section-header">Factor Weights — Market & On-Chain</div>', unsafe_allow_html=True)
    w_fear_greed   = st.slider("Fear & Greed",     0, 100, 12, step=1, help="Alternative.me composite index. High greed = high risk.")
    w_funding_rate = st.slider("Funding Rate",     0, 100, 12, step=1, help="Binance perp funding rate. Positive = overleveraged longs.")
    w_dxy          = st.slider("DXY (Dollar)",     0, 100,  5, step=1, help="US Dollar Index. Strong dollar = headwind for crypto.")

    weight_total = w_mvrv + w_valuation + w_trend + w_structure + w_sentiment + w_fear_greed + w_funding_rate + w_dxy
    if weight_total == 0:
        st.error("At least one weight must be > 0.")
        st.stop()

    weights = {
        "mvrv":         w_mvrv         / weight_total,
        "valuation":    w_valuation    / weight_total,
        "trend":        w_trend        / weight_total,
        "structure":    w_structure    / weight_total,
        "sentiment":    w_sentiment    / weight_total,
        "fear_greed":   w_fear_greed   / weight_total,
        "funding_rate": w_funding_rate / weight_total,
        "dxy":          w_dxy          / weight_total,
    }

    st.divider()
    st.markdown('<div class="section-header">Buy Zone</div>', unsafe_allow_html=True)
    buy_max  = st.slider("Max risk score to buy", 1.0, 5.0, 3.0, step=0.5)
    tier     = buy_max / 3
    amt_high = st.number_input(f"$ when risk < {tier:.1f}",     value=600, step=50, min_value=0)
    amt_mid  = st.number_input(f"$ when risk < {tier*2:.1f}",   value=400, step=50, min_value=0)
    amt_low  = st.number_input(f"$ when risk < {buy_max:.1f}",  value=200, step=50, min_value=0)
    amounts  = (float(amt_high), float(amt_mid), float(amt_low))

    st.markdown('<div class="section-header">Sell Zone</div>', unsafe_allow_html=True)
    sell_start = st.slider("Risk score to start selling", 4.0, 9.0, 6.0, step=0.5)

    st.divider()
    st.markdown('<div class="section-header">Backtest Settings</div>', unsafe_allow_html=True)
    starting_cash    = st.number_input("Starting cash ($)", value=30_000, step=1_000, min_value=1_000)
    display_start    = st.date_input("Display start",    value=pd.Timestamp("2020-01-01"))
    deployment_start = st.date_input("Deployment start", value=pd.Timestamp("2026-06-01"))
    benchmark_dca    = st.number_input("Benchmark weekly DCA ($)", value=200, step=50, min_value=0)

# ── Load data ─────────────────────────────────────────────────────────────────

with st.spinner(f"Loading {asset_label} data…"):
    raw = get_price_data(ticker)

with st.spinner("Fetching on-chain & market data…"):
    external = get_external_data(ticker)

data_status = {
    "Fear & Greed": not external["fear_greed"].empty,
    "Funding Rate": not external["funding_rate"].empty,
    "MVRV":         not external["mvrv"].empty,
    "DXY":          not external["dxy"].empty,
}

with st.spinner("Running risk model…"):
    factors = add_factors(raw, external=external)
    signals = add_risk_and_allocation(factors, weights=weights)
    results = run_backtest(
        signals,
        starting_cash=float(starting_cash),
        deployment_start=str(deployment_start),
        display_start=str(display_start),
        benchmark_weekly_dca=float(benchmark_dca),
        buy_max=buy_max,
        amounts=amounts,
        sell_start=sell_start,
    )

overview      = build_overview(results, buy_max=buy_max, amounts=amounts, sell_start=sell_start)
latest_risk   = float(overview["latest_risk"])
next_buy      = float(overview["next_sunday_amount"])
sell_tier     = float(overview["current_sell_fraction"])
current_price = float(results["close"].iloc[-1])
prev_price    = float(results["close"].iloc[-2])
price_change  = (current_price - prev_price) / prev_price

# ── Header ────────────────────────────────────────────────────────────────────

st.markdown(f"## {asset_label} — Risk Model")
st.caption("Risk-managed DCA strategy. Adjust parameters in the sidebar to explore scenarios.")

# Data source status pills
status_html = " &nbsp;·&nbsp; ".join(
    f'<span class="{"source-ok" if ok else "source-fail"}">{"✓" if ok else "✗"} {name}</span>'
    for name, ok in data_status.items()
)
st.markdown(f"<div style='margin-bottom:16px;'>Data sources: {status_html}</div>", unsafe_allow_html=True)

# Signal banner
if latest_risk < buy_max:
    cls, txt, clr = "signal-buy",  f"BUY — ${next_buy:,.0f} this Sunday", "buy-color"
elif latest_risk >= sell_start:
    cls, txt, clr = "signal-sell", f"SELL — {sell_tier:.0%} of holdings",  "sell-color"
else:
    cls, txt, clr = "signal-hold", "HOLD — no action this week",           "hold-color"

arrow     = "▲" if price_change >= 0 else "▼"
arrow_clr = "#34d399" if price_change >= 0 else "#f87171"

st.markdown(f"""
<div class="signal-banner {cls}">
  <div>
    <div class="signal-label">Current Price</div>
    <div class="signal-value" style="color:#e8eaf0">
      ${current_price:,.2f}
      <span style="font-size:0.95rem;color:{arrow_clr}">&nbsp;{arrow} {abs(price_change):.2%}</span>
    </div>
  </div>
  <div class="signal-divider"></div>
  <div>
    <div class="signal-label">Risk Score</div>
    <div class="signal-value {clr}">{latest_risk:.2f} <span style="font-size:0.95rem;color:#5a6175">/ 10</span></div>
  </div>
  <div class="signal-divider"></div>
  <div>
    <div class="signal-label">Weekly Signal</div>
    <div class="signal-value {clr}">{txt}</div>
  </div>
  <div class="signal-divider"></div>
  <div>
    <div class="signal-label">Fear & Greed</div>
    <div class="signal-value" style="color:#e8eaf0">{results["fear_greed_raw"].iloc[-1]:.0f} <span style="font-size:0.85rem;color:#5a6175">/ 100</span></div>
  </div>
  <div class="signal-divider"></div>
  <div>
    <div class="signal-label">Funding Rate</div>
    <div class="signal-value" style="color:#e8eaf0">{results["funding_rate_raw"].iloc[-1]*100:.4f}%</div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Key metrics ───────────────────────────────────────────────────────────────

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Strategy Value",   f"${float(overview['strategy_final']):,.0f}")
c2.metric("Buy & Hold Value", f"${float(overview['buy_hold_final']):,.0f}")
c3.metric("Starting Cash",    f"${float(overview['starting_cash']):,.0f}")
c4.metric("Strategy Max DD",  f"{float(overview['strategy_dd'])*100:.1f}%")
c5.metric("B&H Max DD",       f"{float(overview['buy_hold_dd'])*100:.1f}%")

st.markdown("<br>", unsafe_allow_html=True)

# ── Chart helpers ─────────────────────────────────────────────────────────────

chart = results.resample("W-SUN").agg({
    "close":                  "last",
    "buy_hold_portfolio":     "last",
    "strategy_portfolio":     "last",
    "risk_score":             "last",
    "strategy_dca":           "sum",
    "strategy_btc_sold":      "sum",
    "strategy_sell_proceeds": "sum",
    "strategy_cash":          "last",
    "strategy_btc_holdings":  "last",
    "sell_fraction":          "max",
    "fear_greed_raw":         "last",
    "funding_rate_raw":       "last",
    "mvrv_raw":               "last",
    "dxy_raw":                "last",
}).dropna(subset=["close", "risk_score"])

deploy_ts  = pd.Timestamp(str(deployment_start))
BLUE, GREEN, RED, GRAY = "#4f7cff", "#34d399", "#f87171", "#8b92a5"
GRID, PAPER, PLOT       = "#1e2336", "#0f1117", "#131720"

def base_layout(title: str, y_title: str, **kw) -> dict:
    return dict(
        title=dict(text=title, font=dict(color="#e8eaf0", size=14), x=0),
        paper_bgcolor=PAPER, plot_bgcolor=PLOT,
        font=dict(color=GRAY, size=12),
        xaxis=dict(gridcolor=GRID, showline=False, zeroline=False),
        yaxis=dict(gridcolor=GRID, showline=False, zeroline=False, title=y_title),
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=GRAY), orientation="h", y=1.08),
        hovermode="x unified",
        hoverlabel=dict(bgcolor="#1c2133", font_color="#e8eaf0", bordercolor="#2a2f3e"),
        margin=dict(l=0, r=0, t=48, b=0),
        height=380,
        **kw,
    )

def add_deploy_vline(fig):
    fig.add_vline(
        x=deploy_ts.timestamp() * 1000,
        line_dash="dot", line_color="#3a3f52", line_width=1.5,
        annotation_text="Live", annotation_font_color=GRAY, annotation_position="top right",
    )

tab1, tab2, tab3, tab4 = st.tabs(["Portfolio", "Risk Score", "On-Chain & Market", "Capital Flow"])

# ── Tab 1: Portfolio ──────────────────────────────────────────────────────────
with tab1:
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=chart.index, y=chart["buy_hold_portfolio"],
        name="Buy & Hold DCA", line=dict(color=GRAY, width=1.5, dash="dot"),
        hovertemplate="%{x|%b %d %Y}<br>Buy & Hold: $%{y:,.0f}<extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x=chart.index, y=chart["strategy_portfolio"],
        name="Risk-Managed Strategy", line=dict(color=BLUE, width=2.5),
        fill="tozeroy", fillcolor="rgba(79,124,255,0.06)",
        hovertemplate="%{x|%b %d %Y}<br>Strategy: $%{y:,.0f}<extra></extra>",
    ))
    add_deploy_vline(fig)
    fig.update_layout(**base_layout("Portfolio Value (Weekly)", "Value ($)"))
    fig.update_yaxes(tickprefix="$")
    st.plotly_chart(fig, use_container_width=True)

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Invested",          f"${float(overview['strategy_invested']):,.0f}")
    m2.metric("Cash on Hand",      f"${float(overview['strategy_cash']):,.0f}")
    m3.metric(f"{asset_short} Holdings", f"{float(overview['strategy_btc_holdings']):.6f}")
    m4.metric("Risk / Return Corr", f"{float(overview['risk_future_corr']):.4f}")

# ── Tab 2: Risk score ─────────────────────────────────────────────────────────
with tab2:
    fig2 = go.Figure()
    fig2.add_hrect(y0=0,         y1=buy_max,    fillcolor=GREEN, opacity=0.05, line_width=0)
    fig2.add_hrect(y0=buy_max,   y1=sell_start, fillcolor=GRAY,  opacity=0.03, line_width=0)
    fig2.add_hrect(y0=sell_start, y1=10,        fillcolor=RED,   opacity=0.05, line_width=0)

    fig2.add_trace(go.Scatter(
        x=chart.index, y=chart["risk_score"],
        name="Risk Score", line=dict(color=BLUE, width=2.2),
        hovertemplate="%{x|%b %d %Y}<br>Risk: %{y:.2f}<extra></extra>",
    ))

    buy_mask  = chart["strategy_dca"] > 0
    sell_mask = chart["strategy_btc_sold"] > 0
    fig2.add_trace(go.Scatter(
        x=chart.index[buy_mask], y=chart.loc[buy_mask, "risk_score"],
        mode="markers", name="Buy",
        marker=dict(color=GREEN, size=7, symbol="circle", line=dict(color=PLOT, width=1)),
        hovertemplate="%{x|%b %d %Y}<br>Buy: $%{customdata:,.0f}<extra></extra>",
        customdata=chart.loc[buy_mask, "strategy_dca"],
    ))
    fig2.add_trace(go.Scatter(
        x=chart.index[sell_mask], y=chart.loc[sell_mask, "risk_score"],
        mode="markers", name="Sell",
        marker=dict(color=RED, size=9, symbol="triangle-down", line=dict(color=PLOT, width=1)),
        hovertemplate="%{x|%b %d %Y}<br>Sell tier: %{customdata:.0%}<extra></extra>",
        customdata=chart.loc[sell_mask, "sell_fraction"],
    ))
    fig2.add_hline(y=buy_max,    line_dash="dash", line_color=GREEN, line_width=1,
                   annotation_text=f"Buy < {buy_max}", annotation_font_color=GREEN, annotation_position="right")
    fig2.add_hline(y=sell_start, line_dash="dash", line_color=RED,   line_width=1,
                   annotation_text=f"Sell > {sell_start}", annotation_font_color=RED, annotation_position="right")
    add_deploy_vline(fig2)
    fig2.update_layout(**base_layout("Risk Score (Weekly)", "Risk (0–10)"))
    fig2.update_yaxes(range=[0, 10])
    st.plotly_chart(fig2, use_container_width=True)

    factor_df = pd.DataFrame({
        "Factor":       ["MVRV",         "Valuation", "Trend",                        "Fear & Greed",            "Funding Rate",                   "Structure",    "Sentiment",       "DXY"],
        "Weight":       [f"{weights[k]:.1%}" for k in ["mvrv","valuation","trend","fear_greed","funding_rate","structure","sentiment","dxy"]],
        "Data Source":  ["CoinMetrics",  "yfinance",  "yfinance",                     "alternative.me",          "Binance Futures",                "yfinance",     "yfinance",        "yfinance"],
        "Live":         ["✓" if data_status["MVRV"] else "✗",
                         "✓","✓",
                         "✓" if data_status["Fear & Greed"] else "✗",
                         "✓" if data_status["Funding Rate"] else "✗",
                         "✓","✓",
                         "✓" if data_status["DXY"] else "✗"],
        "Signal logic": [
            "High MVRV = overvalued vs realized cap = high risk",
            "Log price z-score vs 365d history",
            "RSI-14, price vs MA-20 & MA-200",
            "High greed (>75) = high risk; fear (<25) = low risk",
            "Positive rate = overleveraged longs = high risk",
            "High 30d volatility = high risk",
            "Strong 30d return z-score = high risk",
            "Strong USD = macro headwind for crypto",
        ],
    })
    st.dataframe(factor_df, hide_index=True, use_container_width=True)

# ── Tab 3: On-Chain & Market ──────────────────────────────────────────────────
with tab3:
    col_a, col_b = st.columns(2)

    with col_a:
        # Fear & Greed
        fg_col = chart["fear_greed_raw"].dropna()
        fig_fg = go.Figure()
        fig_fg.add_trace(go.Scatter(
            x=fg_col.index, y=fg_col,
            name="Fear & Greed", line=dict(color="#f59e0b", width=2),
            fill="tozeroy", fillcolor="rgba(245,158,11,0.07)",
            hovertemplate="%{x|%b %d %Y}<br>F&G: %{y:.0f}<extra></extra>",
        ))
        fig_fg.add_hline(y=25,  line_dash="dash", line_color=GREEN, line_width=1, annotation_text="Extreme Fear", annotation_font_color=GREEN, annotation_position="right")
        fig_fg.add_hline(y=75,  line_dash="dash", line_color=RED,   line_width=1, annotation_text="Extreme Greed", annotation_font_color=RED,   annotation_position="right")
        fig_fg.update_layout(**base_layout("Fear & Greed Index", "Score (0–100)"))
        fig_fg.update_yaxes(range=[0, 100])
        st.plotly_chart(fig_fg, use_container_width=True)

        # MVRV
        mvrv_col = chart["mvrv_raw"].dropna()
        if not mvrv_col.empty:
            fig_mv = go.Figure()
            fig_mv.add_trace(go.Scatter(
                x=mvrv_col.index, y=mvrv_col,
                name="MVRV", line=dict(color="#a78bfa", width=2),
                hovertemplate="%{x|%b %d %Y}<br>MVRV: %{y:.2f}<extra></extra>",
            ))
            fig_mv.add_hline(y=3.5, line_dash="dash", line_color=RED,   line_width=1, annotation_text="Historically overvalued", annotation_font_color=RED,   annotation_position="right")
            fig_mv.add_hline(y=1.0, line_dash="dash", line_color=GREEN, line_width=1, annotation_text="Undervalued zone",        annotation_font_color=GREEN, annotation_position="right")
            fig_mv.update_layout(**base_layout("MVRV Ratio", "MVRV"))
            st.plotly_chart(fig_mv, use_container_width=True)
        else:
            st.info("MVRV data not available for this asset.")

    with col_b:
        # Funding Rate
        fr_col = chart["funding_rate_raw"].dropna()
        if not fr_col.empty:
            colors = [GREEN if v <= 0 else RED for v in fr_col]
            fig_fr = go.Figure()
            fig_fr.add_trace(go.Bar(
                x=fr_col.index, y=fr_col * 100,
                name="Funding Rate", marker_color=colors, opacity=0.75,
                hovertemplate="%{x|%b %d %Y}<br>Rate: %{y:.4f}%<extra></extra>",
            ))
            fig_fr.add_hline(y=0, line_color=GRAY, line_width=1)
            fig_fr.update_layout(**base_layout("Daily Average Funding Rate", "Rate (%)"))
            st.plotly_chart(fig_fr, use_container_width=True)
        else:
            st.info("Funding rate data not available for this asset.")

        # DXY
        dxy_col = chart["dxy_raw"].dropna()
        if not dxy_col.empty:
            fig_dxy = go.Figure()
            fig_dxy.add_trace(go.Scatter(
                x=dxy_col.index, y=dxy_col,
                name="DXY", line=dict(color="#38bdf8", width=2),
                hovertemplate="%{x|%b %d %Y}<br>DXY: %{y:.2f}<extra></extra>",
            ))
            fig_dxy.update_layout(**base_layout("US Dollar Index (DXY)", "DXY Level"))
            st.plotly_chart(fig_dxy, use_container_width=True)
        else:
            st.info("DXY data not available.")

# ── Tab 4: Capital flow ───────────────────────────────────────────────────────
with tab4:
    fig4 = go.Figure()
    fig4.add_trace(go.Bar(
        x=chart.index, y=chart["strategy_dca"],
        name="Weekly Buy", marker_color=GREEN, opacity=0.7,
        hovertemplate="%{x|%b %d %Y}<br>Bought: $%{y:,.0f}<extra></extra>",
    ))
    fig4.add_trace(go.Bar(
        x=chart.index, y=-chart["strategy_sell_proceeds"],
        name="Sell Proceeds", marker_color=RED, opacity=0.7,
        hovertemplate="%{x|%b %d %Y}<br>Sold: $%{customdata:,.0f}<extra></extra>",
        customdata=chart["strategy_sell_proceeds"],
    ))
    fig4.add_trace(go.Scatter(
        x=chart.index, y=chart["strategy_cash"],
        name="Cash Position", line=dict(color=BLUE, width=2), yaxis="y2",
        hovertemplate="%{x|%b %d %Y}<br>Cash: $%{y:,.0f}<extra></extra>",
    ))
    add_deploy_vline(fig4)
    layout4 = base_layout("Capital Flow (Weekly)", "Weekly Flow ($)", barmode="relative")
    layout4["yaxis2"] = dict(
        title="Cash ($)", overlaying="y", side="right",
        gridcolor=GRID, showline=False, zeroline=False, tickprefix="$",
    )
    fig4.update_layout(**layout4)
    fig4.update_yaxes(tickprefix="$", secondary_y=False)
    st.plotly_chart(fig4, use_container_width=True)

# ── Raw data ──────────────────────────────────────────────────────────────────
with st.expander("View raw data (last 30 rows)"):
    cols = [
        "close", "valuation", "trend", "structure", "sentiment",
        "mvrv", "fear_greed", "funding_rate", "dxy",
        "risk_score", "risk_used", "strategy_dca", "sell_fraction",
        "strategy_cash", "strategy_portfolio", "buy_hold_portfolio",
    ]
    st.dataframe(results[cols].tail(30).round(4), use_container_width=True)

st.markdown(
    f"<div style='color:#3a3f52;font-size:0.75rem;margin-top:24px'>"
    f"Price: Yahoo Finance · Fear & Greed: alternative.me · "
    f"Funding: Binance · MVRV: CoinMetrics · "
    f"Deployment: {overview['deployment_start']} · Display: {overview['display_start']}"
    f"</div>",
    unsafe_allow_html=True,
)
