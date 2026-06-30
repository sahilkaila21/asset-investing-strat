from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "btc_mvp"))

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd

from data import load_btc_data
from factors import add_factors, add_risk_and_allocation
from backtest import build_overview, run_backtest, sell_fraction_for_risk, weekly_strategy_amount
from utils import max_drawdown

st.set_page_config(
    page_title="Bitcoin Risk Model",
    page_icon="₿",
    layout="wide",
)

# ── Data (cached so it only re-downloads when the session is fresh) ──────────

@st.cache_data(ttl=3600, show_spinner="Fetching BTC price data…")
def get_raw_data() -> pd.DataFrame:
    return load_btc_data()


# ── Sidebar controls ─────────────────────────────────────────────────────────

with st.sidebar:
    st.title("₿ Risk Model Settings")

    st.subheader("Factor Weights")
    st.caption("Weights are auto-normalized to sum to 100%.")
    w_valuation = st.slider("Valuation", 0, 100, 35, step=5)
    w_trend = st.slider("Trend", 0, 100, 25, step=5)
    w_structure = st.slider("Structure", 0, 100, 20, step=5)
    w_sentiment = st.slider("Sentiment", 0, 100, 20, step=5)

    weight_total = w_valuation + w_trend + w_structure + w_sentiment
    if weight_total == 0:
        st.error("At least one weight must be > 0.")
        st.stop()

    weights = {
        "valuation": w_valuation / weight_total,
        "trend": w_trend / weight_total,
        "structure": w_structure / weight_total,
        "sentiment": w_sentiment / weight_total,
    }
    st.caption(
        f"Normalized: Val {weights['valuation']:.0%} · "
        f"Trend {weights['trend']:.0%} · "
        f"Str {weights['structure']:.0%} · "
        f"Sent {weights['sentiment']:.0%}"
    )

    st.divider()
    st.subheader("Buy Zone")
    buy_max = st.slider("Max risk to buy (0–10)", 1.0, 5.0, 3.0, step=0.5)
    st.caption(f"Buys when risk < {buy_max:.1f}")
    tier = buy_max / 3
    amt_high = st.number_input(f"Amount when risk < {tier:.1f}", value=600, step=50, min_value=0)
    amt_mid = st.number_input(f"Amount when risk < {tier * 2:.1f}", value=400, step=50, min_value=0)
    amt_low = st.number_input(f"Amount when risk < {buy_max:.1f}", value=200, step=50, min_value=0)
    amounts = (float(amt_high), float(amt_mid), float(amt_low))

    st.divider()
    st.subheader("Sell Zone")
    sell_start = st.slider("Risk level to start selling", 4.0, 9.0, 6.0, step=0.5)
    st.caption(
        f"Sell tiers: {sell_start:.1f}→10% · {sell_start+0.5:.1f}→20% · "
        f"{sell_start+1.0:.1f}→25% · {sell_start+1.5:.1f}→30% · "
        f"{sell_start+2.0:.1f}→40% · {sell_start+2.5:.1f}→50%"
    )

    st.divider()
    st.subheader("Backtest Settings")
    starting_cash = st.number_input("Starting cash ($)", value=30_000, step=1_000, min_value=1_000)
    display_start = st.date_input("Display start", value=pd.Timestamp("2020-01-01"))
    deployment_start = st.date_input("Deployment start", value=pd.Timestamp("2026-06-01"))
    benchmark_dca = st.number_input("Benchmark weekly DCA ($)", value=200, step=50, min_value=0)

    if pd.Timestamp(str(deployment_start)) < pd.Timestamp(str(display_start)):
        st.warning("Deployment start is before display start — they will be treated as equal.")


# ── Run the pipeline ─────────────────────────────────────────────────────────

raw = get_raw_data()

with st.spinner("Running model…"):
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

overview = build_overview(results, buy_max=buy_max, amounts=amounts, sell_start=sell_start)
latest_risk = float(overview["latest_risk"])
next_buy = float(overview["next_sunday_amount"])
sell_tier = float(overview["current_sell_fraction"])


# ── Header ───────────────────────────────────────────────────────────────────

st.title("Bitcoin Risk Model")
st.caption(
    "A risk-managed DCA strategy that scores Bitcoin market conditions daily "
    "and adjusts weekly buy/sell signals accordingly."
)

# Current signal banner
if latest_risk < buy_max:
    signal_color = "green"
    signal_label = f"BUY — ${next_buy:,.0f} this Sunday"
elif latest_risk >= sell_start:
    signal_color = "red"
    signal_label = f"SELL — {sell_tier:.0%} of BTC holdings"
else:
    signal_color = "gray"
    signal_label = "HOLD — no action this week"

st.markdown(
    f"<div style='background:{'#e6f4ea' if signal_color=='green' else '#fde8e8' if signal_color=='red' else '#f0f0f0'};"
    f"border-left:5px solid {'#2ca02c' if signal_color=='green' else '#d62728' if signal_color=='red' else '#888'};"
    f"padding:14px 20px;border-radius:6px;font-size:1.1rem;font-weight:600'>"
    f"Current Signal: {signal_label} &nbsp;·&nbsp; Risk score: {latest_risk:.2f} / 10"
    f"</div>",
    unsafe_allow_html=True,
)

st.markdown("<br>", unsafe_allow_html=True)

# ── Key metrics row ──────────────────────────────────────────────────────────

col1, col2, col3, col4, col5 = st.columns(5)
col1.metric("Strategy Value", f"${float(overview['strategy_final']):,.0f}")
col2.metric("Buy & Hold Value", f"${float(overview['buy_hold_final']):,.0f}")
col3.metric("Strategy Max DD", f"{float(overview['strategy_dd'])*100:.1f}%")
col4.metric("Buy & Hold Max DD", f"{float(overview['buy_hold_dd'])*100:.1f}%")
col5.metric("Risk / Return Corr", f"{float(overview['risk_future_corr']):.4f}")

st.divider()

# ── Charts ───────────────────────────────────────────────────────────────────

# Resample to weekly for chart readability
chart = results.resample("W-SUN").agg(
    {
        "close": "last",
        "buy_hold_portfolio": "last",
        "strategy_portfolio": "last",
        "risk_score": "last",
        "risk_used": "last",
        "strategy_dca": "sum",
        "strategy_btc_sold": "sum",
        "strategy_sell_proceeds": "sum",
        "strategy_cash": "last",
        "strategy_btc_holdings": "last",
        "sell_fraction": "max",
    }
).dropna(subset=["close", "risk_score"])

deploy_ts = pd.Timestamp(str(deployment_start))

tab1, tab2, tab3 = st.tabs(["Portfolio Performance", "Risk Score", "Capital Flow"])

# ── Tab 1: Equity ────────────────────────────────────────────────────────────
with tab1:
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=chart.index, y=chart["buy_hold_portfolio"],
        name="Buy & Hold DCA", line=dict(color="#aec7e8"),
        hovertemplate="%{x|%Y-%m-%d}<br>Buy & Hold: $%{y:,.0f}<extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x=chart.index, y=chart["strategy_portfolio"],
        name="Risk-Managed DCA", line=dict(color="#1f77b4", width=2.5),
        hovertemplate="%{x|%Y-%m-%d}<br>Strategy: $%{y:,.0f}<extra></extra>",
    ))
    fig.add_vline(
        x=deploy_ts.timestamp() * 1000, line_dash="dot",
        line_color="#333", annotation_text="Deployment start",
        annotation_position="top right",
    )
    fig.update_layout(
        title="Portfolio Value Over Time (Weekly)",
        yaxis_title="Portfolio Value ($)",
        yaxis_tickprefix="$",
        legend=dict(orientation="h", y=1.08),
        hovermode="x unified",
        height=420,
    )
    st.plotly_chart(fig, use_container_width=True)

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Starting Cash", f"${float(overview['starting_cash']):,.0f}")
    c2.metric("Strategy Invested", f"${float(overview['strategy_invested']):,.0f}")
    c3.metric("BTC Holdings", f"{float(overview['strategy_btc_holdings']):.6f} BTC")
    c4.metric("Cash on Hand", f"${float(overview['strategy_cash']):,.0f}")

# ── Tab 2: Risk score ─────────────────────────────────────────────────────────
with tab2:
    fig2 = go.Figure()

    # Shaded zones
    fig2.add_hrect(y0=0, y1=buy_max, fillcolor="#2ca02c", opacity=0.08, line_width=0, annotation_text="Buy zone", annotation_position="left")
    fig2.add_hrect(y0=buy_max, y1=sell_start, fillcolor="#7f7f7f", opacity=0.06, line_width=0, annotation_text="Hold zone", annotation_position="left")
    fig2.add_hrect(y0=sell_start, y1=10, fillcolor="#d62728", opacity=0.08, line_width=0, annotation_text="Sell zone", annotation_position="left")

    fig2.add_trace(go.Scatter(
        x=chart.index, y=chart["risk_score"],
        name="Risk Score", line=dict(color="#d62728", width=2),
        hovertemplate="%{x|%Y-%m-%d}<br>Risk: %{y:.2f}<extra></extra>",
    ))

    buy_mask = chart["strategy_dca"] > 0
    sell_mask = chart["strategy_btc_sold"] > 0
    fig2.add_trace(go.Scatter(
        x=chart.index[buy_mask], y=chart.loc[buy_mask, "risk_score"],
        mode="markers", name="Buy signal",
        marker=dict(color="#2ca02c", size=7, symbol="circle"),
        hovertemplate="%{x|%Y-%m-%d}<br>Buy: $%{customdata:,.0f}<extra></extra>",
        customdata=chart.loc[buy_mask, "strategy_dca"],
    ))
    fig2.add_trace(go.Scatter(
        x=chart.index[sell_mask], y=chart.loc[sell_mask, "risk_score"],
        mode="markers", name="Sell signal",
        marker=dict(color="#d62728", size=9, symbol="triangle-down"),
        hovertemplate="%{x|%Y-%m-%d}<br>Sell tier: %{customdata:.0%}<extra></extra>",
        customdata=chart.loc[sell_mask, "sell_fraction"],
    ))
    fig2.add_hline(y=buy_max, line_dash="dash", line_color="#2ca02c", line_width=1)
    fig2.add_hline(y=sell_start, line_dash="dash", line_color="#d62728", line_width=1)
    fig2.add_vline(x=deploy_ts.timestamp() * 1000, line_dash="dot", line_color="#333")

    fig2.update_layout(
        title="Risk Score Over Time (Weekly)",
        yaxis_title="Risk Score (0–10)",
        yaxis=dict(range=[0, 10]),
        legend=dict(orientation="h", y=1.08),
        hovermode="x unified",
        height=420,
    )
    st.plotly_chart(fig2, use_container_width=True)

    st.markdown("**How the risk score is built**")
    weight_df = pd.DataFrame(
        {
            "Factor": ["Valuation", "Trend", "Structure", "Sentiment"],
            "Weight": [
                f"{weights['valuation']:.0%}",
                f"{weights['trend']:.0%}",
                f"{weights['structure']:.0%}",
                f"{weights['sentiment']:.0%}",
            ],
            "What it measures": [
                "Z-score of log price vs 365-day window — high price = high risk",
                "RSI-14, price vs MA-20, price vs MA-200",
                "Annualized 30-day volatility — high volatility = high risk",
                "Z-score of 30-day return — strong recent gains = high risk",
            ],
        }
    )
    st.dataframe(weight_df, hide_index=True, use_container_width=True)

# ── Tab 3: Capital flow ───────────────────────────────────────────────────────
with tab3:
    fig3 = go.Figure()
    fig3.add_trace(go.Bar(
        x=chart.index, y=chart["strategy_dca"],
        name="Weekly Buy Amount", marker_color="#2ca02c", opacity=0.6,
        hovertemplate="%{x|%Y-%m-%d}<br>Bought: $%{y:,.0f}<extra></extra>",
    ))
    fig3.add_trace(go.Bar(
        x=chart.index, y=-chart["strategy_sell_proceeds"],
        name="Sell Proceeds (inverted)", marker_color="#d62728", opacity=0.6,
        hovertemplate="%{x|%Y-%m-%d}<br>Sold: $%{customdata:,.0f}<extra></extra>",
        customdata=chart["strategy_sell_proceeds"],
    ))
    fig3.add_trace(go.Scatter(
        x=chart.index, y=chart["strategy_cash"],
        name="Cash Position", line=dict(color="#1f77b4", width=2),
        yaxis="y2",
        hovertemplate="%{x|%Y-%m-%d}<br>Cash: $%{y:,.0f}<extra></extra>",
    ))
    fig3.add_vline(x=deploy_ts.timestamp() * 1000, line_dash="dot", line_color="#333")
    fig3.update_layout(
        title="Capital Flow (Weekly)",
        yaxis_title="Weekly Flow ($)",
        yaxis2=dict(title="Cash Position ($)", overlaying="y", side="right"),
        barmode="relative",
        legend=dict(orientation="h", y=1.08),
        hovermode="x unified",
        height=420,
    )
    st.plotly_chart(fig3, use_container_width=True)

# ── Raw data expander ─────────────────────────────────────────────────────────

with st.expander("View raw data (last 30 rows)"):
    display_cols = [
        "close", "valuation", "trend", "structure", "sentiment",
        "risk_score", "risk_used", "strategy_dca", "sell_fraction",
        "strategy_btc_sold", "strategy_cash", "strategy_portfolio", "buy_hold_portfolio",
    ]
    st.dataframe(results[display_cols].tail(30).round(4), use_container_width=True)

st.caption(
    f"Data via Yahoo Finance · Deployment start: {overview['deployment_start']} · "
    f"Display start: {overview['display_start']}"
)
