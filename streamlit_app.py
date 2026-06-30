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

# ── Page config ───────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Crypto Risk Model",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Theme / global CSS ────────────────────────────────────────────────────────

st.markdown("""
<style>
    /* Main background */
    .stApp { background-color: #0f1117; color: #e8eaf0; }

    /* Sidebar */
    [data-testid="stSidebar"] { background-color: #161b27; border-right: 1px solid #2a2f3e; }
    [data-testid="stSidebar"] * { color: #c9d1e0 !important; }

    /* Metric cards */
    [data-testid="stMetric"] {
        background: #1c2133;
        border: 1px solid #2a2f3e;
        border-radius: 10px;
        padding: 16px 20px;
    }
    [data-testid="stMetricLabel"] { color: #8b92a5 !important; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; }
    [data-testid="stMetricValue"] { color: #e8eaf0 !important; font-size: 1.4rem; font-weight: 700; }

    /* Signal banner */
    .signal-banner {
        border-radius: 10px;
        padding: 20px 28px;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        gap: 24px;
    }
    .signal-buy  { background: #0d2818; border: 1.5px solid #1a7a40; }
    .signal-sell { background: #2a0d0d; border: 1.5px solid #a02020; }
    .signal-hold { background: #1a1d28; border: 1.5px solid #3a3f52; }

    .signal-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #8b92a5; margin-bottom: 4px; }
    .signal-value { font-size: 1.6rem; font-weight: 800; }
    .signal-divider { width: 1px; height: 48px; background: #2a2f3e; }

    .buy-color  { color: #34d399; }
    .sell-color { color: #f87171; }
    .hold-color { color: #94a3b8; }
    .price-color { color: #e8eaf0; }

    /* Section headers */
    .section-header {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #5a6175;
        margin: 20px 0 8px 0;
    }

    /* Tabs */
    [data-testid="stTabs"] button {
        color: #8b92a5 !important;
        font-weight: 500;
    }
    [data-testid="stTabs"] button[aria-selected="true"] {
        color: #e8eaf0 !important;
        border-bottom-color: #4f7cff !important;
    }

    /* Divider */
    hr { border-color: #2a2f3e !important; }

    /* Dataframe */
    [data-testid="stDataFrame"] { border: 1px solid #2a2f3e; border-radius: 8px; }

    /* Hide Streamlit branding */
    #MainMenu { visibility: hidden; }
    footer { visibility: hidden; }
</style>
""", unsafe_allow_html=True)

# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("## 📈 Risk Model")
    st.markdown('<div class="section-header">Asset</div>', unsafe_allow_html=True)
    asset_label = st.selectbox(
        "Select asset",
        options=list(SUPPORTED_ASSETS.keys()),
        label_visibility="collapsed",
    )
    ticker = SUPPORTED_ASSETS[asset_label]
    asset_short = asset_label.split("(")[-1].replace(")", "").strip()

    st.divider()
    st.markdown('<div class="section-header">Factor Weights</div>', unsafe_allow_html=True)
    st.caption("Auto-normalized to 100%")
    w_valuation = st.slider("Valuation", 0, 100, 35, step=5)
    w_trend     = st.slider("Trend",     0, 100, 25, step=5)
    w_structure = st.slider("Structure", 0, 100, 20, step=5)
    w_sentiment = st.slider("Sentiment", 0, 100, 20, step=5)

    weight_total = w_valuation + w_trend + w_structure + w_sentiment
    if weight_total == 0:
        st.error("At least one weight must be > 0.")
        st.stop()

    weights = {
        "valuation": w_valuation / weight_total,
        "trend":     w_trend     / weight_total,
        "structure": w_structure / weight_total,
        "sentiment": w_sentiment / weight_total,
    }

    st.divider()
    st.markdown('<div class="section-header">Buy Zone</div>', unsafe_allow_html=True)
    buy_max  = st.slider("Max risk score to buy", 1.0, 5.0, 3.0, step=0.5)
    tier     = buy_max / 3
    amt_high = st.number_input(f"$ when risk < {tier:.1f}",      value=600, step=50, min_value=0)
    amt_mid  = st.number_input(f"$ when risk < {tier * 2:.1f}",  value=400, step=50, min_value=0)
    amt_low  = st.number_input(f"$ when risk < {buy_max:.1f}",   value=200, step=50, min_value=0)
    amounts  = (float(amt_high), float(amt_mid), float(amt_low))

    st.divider()
    st.markdown('<div class="section-header">Sell Zone</div>', unsafe_allow_html=True)
    sell_start = st.slider("Risk score to start selling", 4.0, 9.0, 6.0, step=0.5)

    st.divider()
    st.markdown('<div class="section-header">Backtest Settings</div>', unsafe_allow_html=True)
    starting_cash     = st.number_input("Starting cash ($)", value=30_000, step=1_000, min_value=1_000)
    display_start     = st.date_input("Display start",     value=pd.Timestamp("2020-01-01"))
    deployment_start  = st.date_input("Deployment start",  value=pd.Timestamp("2026-06-01"))
    benchmark_dca     = st.number_input("Benchmark weekly DCA ($)", value=200, step=50, min_value=0)


# ── Data & model ──────────────────────────────────────────────────────────────

@st.cache_data(ttl=3600, show_spinner=False)
def get_data(ticker: str) -> pd.DataFrame:
    return load_asset_data(ticker)


with st.spinner(f"Loading {asset_label} data…"):
    raw = get_data(ticker)

with st.spinner("Running risk model…"):
    factors = add_factors(raw)
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

overview        = build_overview(results, buy_max=buy_max, amounts=amounts, sell_start=sell_start)
latest_risk     = float(overview["latest_risk"])
next_buy        = float(overview["next_sunday_amount"])
sell_tier       = float(overview["current_sell_fraction"])
current_price   = float(results["close"].iloc[-1])
prev_price      = float(results["close"].iloc[-2])
price_change    = (current_price - prev_price) / prev_price


# ── Header ────────────────────────────────────────────────────────────────────

st.markdown(f"## {asset_label} — Risk Model")
st.caption("A risk-managed DCA strategy. Adjust parameters in the sidebar to explore different scenarios.")

# Signal logic
if latest_risk < buy_max:
    signal_class  = "signal-buy"
    signal_text   = f"BUY — ${next_buy:,.0f} this Sunday"
    signal_color  = "buy-color"
    risk_color    = "buy-color"
elif latest_risk >= sell_start:
    signal_class  = "signal-sell"
    signal_text   = f"SELL — {sell_tier:.0%} of holdings"
    signal_color  = "sell-color"
    risk_color    = "sell-color"
else:
    signal_class  = "signal-hold"
    signal_text   = "HOLD — no action this week"
    signal_color  = "hold-color"
    risk_color    = "hold-color"

price_arrow = "▲" if price_change >= 0 else "▼"
price_clr   = "#34d399" if price_change >= 0 else "#f87171"

st.markdown(f"""
<div class="signal-banner {signal_class}">
    <div>
        <div class="signal-label">Current Price</div>
        <div class="signal-value price-color">
            ${current_price:,.2f}
            <span style="font-size:1rem;color:{price_clr}">&nbsp;{price_arrow} {abs(price_change):.2%}</span>
        </div>
    </div>
    <div class="signal-divider"></div>
    <div>
        <div class="signal-label">Risk Score</div>
        <div class="signal-value {risk_color}">{latest_risk:.2f} <span style="font-size:1rem;color:#5a6175">/ 10</span></div>
    </div>
    <div class="signal-divider"></div>
    <div>
        <div class="signal-label">Weekly Signal</div>
        <div class="signal-value {signal_color}">{signal_text}</div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Metrics row ───────────────────────────────────────────────────────────────

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Strategy Value",    f"${float(overview['strategy_final']):,.0f}")
c2.metric("Buy & Hold Value",  f"${float(overview['buy_hold_final']):,.0f}")
c3.metric("Starting Cash",     f"${float(overview['starting_cash']):,.0f}")
c4.metric("Strategy Max DD",   f"{float(overview['strategy_dd'])*100:.1f}%")
c5.metric("B&H Max DD",        f"{float(overview['buy_hold_dd'])*100:.1f}%")

st.markdown("<br>", unsafe_allow_html=True)

# ── Chart data ────────────────────────────────────────────────────────────────

chart = results.resample("W-SUN").agg({
    "close":                  "last",
    "buy_hold_portfolio":     "last",
    "strategy_portfolio":     "last",
    "risk_score":             "last",
    "risk_used":              "last",
    "strategy_dca":           "sum",
    "strategy_btc_sold":      "sum",
    "strategy_sell_proceeds": "sum",
    "strategy_cash":          "last",
    "strategy_btc_holdings":  "last",
    "sell_fraction":          "max",
}).dropna(subset=["close", "risk_score"])

deploy_ts   = pd.Timestamp(str(deployment_start))
BLUE        = "#4f7cff"
GREEN       = "#34d399"
RED         = "#f87171"
GRAY        = "#8b92a5"
GRID_COLOR  = "#1e2336"
PAPER_BG    = "#0f1117"
PLOT_BG     = "#131720"

def base_layout(title: str, yaxis_title: str, **kwargs) -> dict:
    return dict(
        title=dict(text=title, font=dict(color="#e8eaf0", size=14), x=0),
        paper_bgcolor=PAPER_BG,
        plot_bgcolor=PLOT_BG,
        font=dict(color=GRAY, size=12),
        xaxis=dict(gridcolor=GRID_COLOR, showline=False, zeroline=False),
        yaxis=dict(gridcolor=GRID_COLOR, showline=False, zeroline=False, title=yaxis_title),
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=GRAY), orientation="h", y=1.08),
        hovermode="x unified",
        hoverlabel=dict(bgcolor="#1c2133", font_color="#e8eaf0", bordercolor="#2a2f3e"),
        margin=dict(l=0, r=0, t=48, b=0),
        height=380,
        **kwargs,
    )

tab1, tab2, tab3 = st.tabs(["Portfolio Performance", "Risk Score", "Capital Flow"])

# ── Tab 1: Equity ─────────────────────────────────────────────────────────────
with tab1:
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=chart.index, y=chart["buy_hold_portfolio"],
        name="Buy & Hold DCA",
        line=dict(color=GRAY, width=1.5, dash="dot"),
        hovertemplate="%{x|%b %d %Y}<br>Buy & Hold: $%{y:,.0f}<extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x=chart.index, y=chart["strategy_portfolio"],
        name="Risk-Managed Strategy",
        line=dict(color=BLUE, width=2.5),
        fill="tozeroy",
        fillcolor="rgba(79,124,255,0.06)",
        hovertemplate="%{x|%b %d %Y}<br>Strategy: $%{y:,.0f}<extra></extra>",
    ))
    fig.add_vline(
        x=deploy_ts.timestamp() * 1000,
        line_dash="dot", line_color="#3a3f52", line_width=1.5,
        annotation_text="Live deployment", annotation_font_color=GRAY,
        annotation_position="top right",
    )
    fig.update_layout(**base_layout("Portfolio Value (Weekly)", "Value (USD)"))
    fig.update_yaxes(tickprefix="$")
    st.plotly_chart(fig, use_container_width=True)

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Strategy Invested",     f"${float(overview['strategy_invested']):,.0f}")
    m2.metric("Cash on Hand",          f"${float(overview['strategy_cash']):,.0f}")
    m3.metric(f"{asset_short} Holdings", f"{float(overview['strategy_btc_holdings']):.6f}")
    m4.metric("Risk / Return Corr",    f"{float(overview['risk_future_corr']):.4f}")

# ── Tab 2: Risk score ─────────────────────────────────────────────────────────
with tab2:
    fig2 = go.Figure()

    fig2.add_hrect(y0=0,        y1=buy_max,   fillcolor=GREEN, opacity=0.05, line_width=0)
    fig2.add_hrect(y0=buy_max,  y1=sell_start,fillcolor=GRAY,  opacity=0.03, line_width=0)
    fig2.add_hrect(y0=sell_start, y1=10,      fillcolor=RED,   opacity=0.05, line_width=0)

    fig2.add_trace(go.Scatter(
        x=chart.index, y=chart["risk_score"],
        name="Risk Score",
        line=dict(color=BLUE, width=2.2),
        hovertemplate="%{x|%b %d %Y}<br>Risk: %{y:.2f}<extra></extra>",
    ))

    buy_mask  = chart["strategy_dca"] > 0
    sell_mask = chart["strategy_btc_sold"] > 0

    fig2.add_trace(go.Scatter(
        x=chart.index[buy_mask], y=chart.loc[buy_mask, "risk_score"],
        mode="markers", name="Buy signal",
        marker=dict(color=GREEN, size=7, symbol="circle", line=dict(color="#0f1117", width=1)),
        hovertemplate="%{x|%b %d %Y}<br>Buy: $%{customdata:,.0f}<extra></extra>",
        customdata=chart.loc[buy_mask, "strategy_dca"],
    ))
    fig2.add_trace(go.Scatter(
        x=chart.index[sell_mask], y=chart.loc[sell_mask, "risk_score"],
        mode="markers", name="Sell signal",
        marker=dict(color=RED, size=9, symbol="triangle-down", line=dict(color="#0f1117", width=1)),
        hovertemplate="%{x|%b %d %Y}<br>Sell: %{customdata:.0%}<extra></extra>",
        customdata=chart.loc[sell_mask, "sell_fraction"],
    ))

    fig2.add_hline(y=buy_max,   line_dash="dash", line_color=GREEN, line_width=1,
                   annotation_text=f"Buy below {buy_max}", annotation_font_color=GREEN, annotation_position="right")
    fig2.add_hline(y=sell_start, line_dash="dash", line_color=RED,  line_width=1,
                   annotation_text=f"Sell above {sell_start}", annotation_font_color=RED, annotation_position="right")
    fig2.add_vline(x=deploy_ts.timestamp() * 1000, line_dash="dot", line_color="#3a3f52", line_width=1.5)

    fig2.update_layout(**base_layout("Risk Score Over Time (Weekly)", "Risk (0–10)"))
    fig2.update_yaxes(range=[0, 10])
    st.plotly_chart(fig2, use_container_width=True)

    st.markdown('<div class="section-header">How the risk score is built</div>', unsafe_allow_html=True)
    factor_df = pd.DataFrame({
        "Factor":       ["Valuation", "Trend", "Structure", "Sentiment"],
        "Weight":       [f"{weights[k]:.0%}" for k in ["valuation","trend","structure","sentiment"]],
        "Description":  [
            "Z-score of log price vs 365-day history — high price = higher risk",
            "RSI-14, price vs MA-20, price vs MA-200 — strong trend = higher risk",
            "Annualized 30-day volatility — high volatility = higher risk",
            "Z-score of 30-day return — strong recent rally = higher risk",
        ],
    })
    st.dataframe(factor_df, hide_index=True, use_container_width=True)

# ── Tab 3: Capital flow ───────────────────────────────────────────────────────
with tab3:
    fig3 = go.Figure()
    fig3.add_trace(go.Bar(
        x=chart.index, y=chart["strategy_dca"],
        name="Weekly Buy",
        marker_color=GREEN, opacity=0.7,
        hovertemplate="%{x|%b %d %Y}<br>Bought: $%{y:,.0f}<extra></extra>",
    ))
    fig3.add_trace(go.Bar(
        x=chart.index, y=-chart["strategy_sell_proceeds"],
        name="Sell Proceeds",
        marker_color=RED, opacity=0.7,
        hovertemplate="%{x|%b %d %Y}<br>Sold: $%{customdata:,.0f}<extra></extra>",
        customdata=chart["strategy_sell_proceeds"],
    ))
    fig3.add_trace(go.Scatter(
        x=chart.index, y=chart["strategy_cash"],
        name="Cash Position",
        line=dict(color=BLUE, width=2),
        yaxis="y2",
        hovertemplate="%{x|%b %d %Y}<br>Cash: $%{y:,.0f}<extra></extra>",
    ))
    fig3.add_vline(x=deploy_ts.timestamp() * 1000, line_dash="dot", line_color="#3a3f52", line_width=1.5)
    layout = base_layout("Capital Flow (Weekly)", "Weekly Flow ($)")
    layout["yaxis2"] = dict(
        title="Cash ($)", overlaying="y", side="right",
        gridcolor=GRID_COLOR, showline=False, zeroline=False, tickprefix="$",
    )
    layout["barmode"] = "relative"
    fig3.update_layout(**layout)
    fig3.update_yaxes(tickprefix="$", secondary_y=False)
    st.plotly_chart(fig3, use_container_width=True)

# ── Raw data ──────────────────────────────────────────────────────────────────

with st.expander("View raw data (last 30 rows)"):
    display_cols = [
        "close", "valuation", "trend", "structure", "sentiment",
        "risk_score", "risk_used", "strategy_dca", "sell_fraction",
        "strategy_btc_sold", "strategy_cash", "strategy_portfolio", "buy_hold_portfolio",
    ]
    st.dataframe(results[display_cols].tail(30).round(4), use_container_width=True)

st.markdown(
    f"<div style='color:#3a3f52;font-size:0.75rem;margin-top:24px'>"
    f"Data via Yahoo Finance · {asset_label} · "
    f"Deployment: {overview['deployment_start']} · "
    f"Display: {overview['display_start']}"
    f"</div>",
    unsafe_allow_html=True,
)
