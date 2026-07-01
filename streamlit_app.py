from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "btc_mvp"))

import streamlit as st
import plotly.graph_objects as go
import pandas as pd

from data import load_asset_data, SUPPORTED_ASSETS
from factors import add_factors, add_risk_and_allocation, DEFAULT_WEIGHTS
from backtest import build_overview, run_backtest
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
        border-radius: 10px; padding: 14px 18px;
    }
    [data-testid="stMetricLabel"] { color: #8b92a5 !important; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    [data-testid="stMetricValue"] { color: #e8eaf0 !important; font-size: 1.3rem; font-weight: 700; }

    .signal-banner { border-radius: 10px; padding: 18px 24px; margin-bottom: 20px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
    .signal-buy  { background: #0d2818; border: 1.5px solid #1a7a40; }
    .signal-sell { background: #2a0d0d; border: 1.5px solid #a02020; }
    .signal-hold { background: #1a1d28; border: 1.5px solid #3a3f52; }
    .signal-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; color: #8b92a5; margin-bottom: 3px; }
    .signal-value { font-size: 1.35rem; font-weight: 800; }
    .signal-divider { width: 1px; height: 44px; background: #2a2f3e; flex-shrink: 0; }
    .buy-color  { color: #34d399; }
    .sell-color { color: #f87171; }
    .hold-color { color: #94a3b8; }

    .section-header { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #5a6175; margin: 14px 0 4px 0; }
    .source-ok   { color: #34d399; font-size: 0.72rem; }
    .source-fail { color: #f87171; font-size: 0.72rem; }

    [data-testid="stTabs"] button { color: #8b92a5 !important; font-weight: 500; }
    [data-testid="stTabs"] button[aria-selected="true"] { color: #e8eaf0 !important; border-bottom-color: #4f7cff !important; }
    hr { border-color: #2a2f3e !important; }
    #MainMenu { visibility: hidden; }
    footer { visibility: hidden !important; height: 0 !important; min-height: 0 !important; }
    footer * { display: none !important; }
    header[data-testid="stHeader"] { visibility: hidden; height: 0; }
    .stDeployButton { display: none !important; }
    [data-testid="stToolbar"] { display: none !important; }
    [data-testid="stStatusWidget"] { display: none !important; }
    .viewerBadge_container__r5tak { display: none !important; }
    .styles_viewerBadge__CvC9N { display: none !important; }
    details summary { color: #8b92a5 !important; font-size: 0.78rem; }
</style>
""", unsafe_allow_html=True)

# ── Cached data ───────────────────────────────────────────────────────────────

@st.cache_data(ttl=3600, show_spinner=False)
def get_price_data(ticker: str) -> pd.DataFrame:
    return load_asset_data(ticker)

@st.cache_data(ttl=14400, show_spinner=False, hash_funcs={})
def get_external_data(ticker: str, _version: int = 4) -> dict:
    """_version bump forces cache invalidation when fetch_all schema changes."""
    return fetch_all(ticker)

# ── Sidebar ───────────────────────────────────────────────────────────────────

# ── Sidebar part 1: asset selector (must run before data load) ────────────────

with st.sidebar:
    st.markdown("## 📈 Risk Model")
    st.markdown('<div class="section-header">Asset</div>', unsafe_allow_html=True)
    asset_label = st.selectbox("Asset", options=list(SUPPORTED_ASSETS.keys()), label_visibility="collapsed")
    ticker = SUPPORTED_ASSETS[asset_label]
    asset_short = asset_label.split("(")[-1].replace(")", "").strip()

# ── Load data (before weight sliders so sidebar can be data-driven) ───────────

with st.spinner(f"Loading {asset_label} data…"):
    raw = get_price_data(ticker)

with st.spinner("Fetching on-chain, market & macro data…"):
    external = get_external_data(ticker)

import pandas as _pd

def _has_data(key: str) -> bool:
    val = external.get(key, _pd.Series(dtype=float))
    return not (val.empty if hasattr(val, "empty") else True)

data_status = {
    "Fear & Greed":   _has_data("fear_greed"),
    "Funding Rate":   _has_data("funding_rate"),
    "MVRV":           _has_data("mvrv"),
    "Network Health": _has_data("network_health"),
    "Puell":          _has_data("puell"),
    "BTC Dominance":  _has_data("btc_dominance"),
    "Interest Rate":  _has_data("interest_rate"),
    "CPI":            _has_data("cpi"),
    "DXY":            _has_data("dxy"),
}

# ── Sidebar part 2: weight sliders (shown only when data is live) ─────────────

with st.sidebar:
    st.divider()
    st.caption("Weights auto-normalize to 100%.")

    dw = DEFAULT_WEIGHTS

    COMING_SOON_HTML = (
        '<span style="background:#1e2336;border:1px solid #2a2f3e;border-radius:4px;'
        'padding:2px 8px;font-size:0.7rem;color:#5a6175;letter-spacing:0.08em;'
        'font-weight:600;text-transform:uppercase">Coming Soon</span>'
    )

    def _cs(label: str, caption: str) -> None:
        """Render a Coming Soon row with label + explanation."""
        st.markdown(f"**{label}** &nbsp; {COMING_SOON_HTML}", unsafe_allow_html=True)
        st.caption(caption)

    with st.expander("🔗 On-Chain", expanded=True):
        if data_status["MVRV"]:
            w_mvrv = st.slider("MVRV Score", 0, 100, int(dw["mvrv"]*100),
                               help="Market cap / realized cap. Best BTC cycle indicator.")
        else:
            _cs("MVRV Score", "Market cap / realized cap — CoinMetrics data pending.")
            w_mvrv = 0

        if data_status["Network Health"]:
            w_network_health = st.slider("Network Health", 0, 100, int(dw["network_health"]*100),
                                         help="Hash Rate + Active Addresses. High = healthy = lower risk.")
        else:
            _cs("Network Health", "Hash Rate + Active Addresses — CoinMetrics data pending.")
            w_network_health = 0

        if data_status["Puell"]:
            w_puell = st.slider("Puell Multiple", 0, 100, int(dw["puell"]*100),
                                help="Miner revenue / 365d avg. High (>4) = cycle top.")
        else:
            _cs("Puell Multiple", "Miner revenue / 365d avg — CoinMetrics data pending.")
            w_puell = 0

        if data_status["Funding Rate"]:
            w_funding_rate = st.slider("Funding Rate", 0, 100, int(dw["funding_rate"]*100),
                                       help="Perp funding rate. High positive = overleveraged longs.")
        else:
            _cs("Funding Rate", "Perp funding rate — requires longer historical dataset.")
            w_funding_rate = 0

    with st.expander("📊 Market & Sentiment", expanded=True):
        w_fear_greed = st.slider("Fear & Greed", 0, 100, int(dw["fear_greed"]*100),
                                 help="alternative.me composite. High greed = high risk.")

        if data_status["BTC Dominance"]:
            w_btc_dominance = st.slider("BTC Dominance", 0, 100, int(dw["btc_dominance"]*100),
                                        help="Low dominance = altcoin euphoria = late bull = high risk.")
        else:
            _cs("BTC Dominance", "BTC market cap share — CoinGecko data pending.")
            w_btc_dominance = 0

        w_trend     = st.slider("Trend",     0, 100, int(dw["trend"]*100),     help="RSI-14, price vs MA-20, price vs MA-200.")
        w_sentiment = st.slider("Sentiment", 0, 100, int(dw["sentiment"]*100), help="Z-score of 30-day price return.")

    with st.expander("💰 Price", expanded=True):
        w_valuation = st.slider("Valuation", 0, 100, int(dw["valuation"]*100), help="Z-score of log price vs 365-day history.")
        w_structure = st.slider("Structure", 0, 100, int(dw["structure"]*100), help="Annualized 30-day volatility. High vol = high risk.")

    with st.expander("🌍 Macro", expanded=True):
        if data_status["Interest Rate"]:
            w_interest_rate = st.slider("Interest Rate", 0, 100, int(dw["interest_rate"]*100),
                                        help="Fed Funds Rate. High/rising = risk-off environment.")
        else:
            _cs("Interest Rate", "Fed Funds Rate — FRED data pending.")
            w_interest_rate = 0

        if data_status["DXY"]:
            w_dxy = st.slider("DXY (Dollar)", 0, 100, int(dw["dxy"]*100),
                              help="US Dollar Index. Strong dollar = headwind for crypto.")
        else:
            _cs("DXY (Dollar)", "US Dollar Index — yfinance data pending.")
            w_dxy = 0

        if data_status["CPI"]:
            w_cpi = st.slider("CPI Inflation", 0, 100, int(dw["cpi"]*100),
                              help="CPI YoY % (FRED). High inflation → rate hikes → risk-off.")
        else:
            _cs("CPI Inflation", "CPI YoY % — FRED data pending.")
            w_cpi = 0

    raw_weights = {
        "mvrv": w_mvrv, "network_health": w_network_health, "puell": w_puell,
        "funding_rate": w_funding_rate, "fear_greed": w_fear_greed,
        "btc_dominance": w_btc_dominance, "trend": w_trend, "sentiment": w_sentiment,
        "valuation": w_valuation, "structure": w_structure,
        "interest_rate": w_interest_rate, "dxy": w_dxy, "cpi": w_cpi,
    }
    total_w = sum(raw_weights.values())
    if total_w == 0:
        st.error("At least one weight must be > 0.")
        st.stop()
    weights = {k: v / total_w for k, v in raw_weights.items()}

    st.divider()
    with st.expander("⚙️ Strategy Settings", expanded=False):
        buy_max  = st.slider("Max risk to buy", 1.0, 5.0, 3.0, step=0.5)
        tier     = buy_max / 3
        amt_high = st.number_input(f"$ when risk < {tier:.1f}",     value=600, step=50, min_value=0)
        amt_mid  = st.number_input(f"$ when risk < {tier*2:.1f}",   value=400, step=50, min_value=0)
        amt_low  = st.number_input(f"$ when risk < {buy_max:.1f}",  value=200, step=50, min_value=0)
        sell_start = st.slider("Risk score to start selling", 4.0, 9.0, 6.0, step=0.5)

    with st.expander("📅 Backtest Settings", expanded=False):
        starting_cash    = st.number_input("Starting cash ($)", value=30_000, step=1_000, min_value=1_000)
        display_start    = st.date_input("Display start",    value=pd.Timestamp("2020-01-01"))
        deployment_start = st.date_input("Deployment start", value=pd.Timestamp("2026-06-01"))
        benchmark_dca    = st.number_input("Benchmark DCA/week ($)", value=200, step=50, min_value=0)

amounts = (float(amt_high), float(amt_mid), float(amt_low))

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
price_change  = (current_price - float(results["close"].iloc[-2])) / float(results["close"].iloc[-2])

# ── Header ────────────────────────────────────────────────────────────────────

st.markdown(f"## {asset_label} — Risk Model")
live_count = sum(1 for v in data_status.values() if v) + 4  # +4 price-based always live
st.caption(f"Risk-managed DCA strategy · {live_count} of 13 signals live · more activating as data confirms.")

status_html = " &nbsp;·&nbsp; ".join(
    f'<span class="{"source-ok" if ok else "source-fail"}">{"✓" if ok else "–"} {name}</span>'
    for name, ok in data_status.items()
)
st.markdown(f"<div style='margin-bottom:14px;font-size:0.78rem'>Data: {status_html}</div>", unsafe_allow_html=True)

if latest_risk < buy_max:
    cls, txt, clr = "signal-buy",  f"BUY — ${next_buy:,.0f} this Sunday", "buy-color"
elif latest_risk >= sell_start:
    cls, txt, clr = "signal-sell", f"SELL — {sell_tier:.0%} of holdings",  "sell-color"
else:
    cls, txt, clr = "signal-hold", "HOLD — no action this week",           "hold-color"

arrow     = "▲" if price_change >= 0 else "▼"
arrow_clr = "#34d399" if price_change >= 0 else "#f87171"

fg_val  = float(results["fear_greed_raw"].iloc[-1])
fr_val  = float(results["funding_rate_raw"].iloc[-1]) * 100
ir_val  = float(results["interest_rate_raw"].iloc[-1]) if results["interest_rate_raw"].notna().any() else None
cpi_val = float(results["cpi_raw"].iloc[-1]) if results["cpi_raw"].notna().any() else None

st.markdown(f"""
<div class="signal-banner {cls}">
  <div>
    <div class="signal-label">Price ({asset_short})</div>
    <div class="signal-value" style="color:#e8eaf0">
      ${current_price:,.2f}
      <span style="font-size:0.9rem;color:{arrow_clr}">&nbsp;{arrow}{abs(price_change):.2%}</span>
    </div>
  </div>
  <div class="signal-divider"></div>
  <div>
    <div class="signal-label">Risk Score</div>
    <div class="signal-value {clr}">{latest_risk:.2f}<span style="font-size:0.85rem;color:#5a6175"> / 10</span></div>
  </div>
  <div class="signal-divider"></div>
  <div>
    <div class="signal-label">Signal</div>
    <div class="signal-value {clr}" style="font-size:1.1rem">{txt}</div>
  </div>
  <div class="signal-divider"></div>
  <div>
    <div class="signal-label">Fear & Greed</div>
    <div class="signal-value" style="color:#e8eaf0">{fg_val:.0f}<span style="font-size:0.8rem;color:#5a6175"> /100</span></div>
  </div>
  <div class="signal-divider"></div>
  <div>
    <div class="signal-label">Funding Rate</div>
    <div class="signal-value" style="color:{'#f87171' if fr_val > 0.01 else '#34d399' if fr_val < -0.005 else '#e8eaf0'}">{fr_val:.4f}%</div>
  </div>
  {"<div class='signal-divider'></div><div><div class='signal-label'>Fed Funds</div><div class='signal-value' style='color:#e8eaf0'>" + f"{ir_val:.2f}%" + "</div></div>" if ir_val is not None else ""}
  {"<div class='signal-divider'></div><div><div class='signal-label'>CPI YoY</div><div class='signal-value' style='color:{'#f87171' if cpi_val and cpi_val > 4 else '#e8eaf0'}'>" + f"{cpi_val:.1f}%" + "</div></div>" if cpi_val is not None else ""}
</div>
""", unsafe_allow_html=True)

# ── Metrics ───────────────────────────────────────────────────────────────────

c1, c2, c3, c4, c5, c6 = st.columns(6)
c1.metric("Strategy Value",   f"${float(overview['strategy_final']):,.0f}")
c2.metric("Buy & Hold",       f"${float(overview['buy_hold_final']):,.0f}")
c3.metric("Starting Cash",    f"${float(overview['starting_cash']):,.0f}")
c4.metric("Strategy Max DD",  f"{float(overview['strategy_dd'])*100:.1f}%")
c5.metric("B&H Max DD",       f"{float(overview['buy_hold_dd'])*100:.1f}%")
c6.metric("Risk/Return Corr", f"{float(overview['risk_future_corr']):.4f}")

st.markdown("<br>", unsafe_allow_html=True)

# ── Chart helpers ─────────────────────────────────────────────────────────────

agg_dict = {
    "close": "last", "buy_hold_portfolio": "last", "strategy_portfolio": "last",
    "risk_score": "last", "strategy_dca": "sum", "strategy_btc_sold": "sum",
    "strategy_sell_proceeds": "sum", "strategy_cash": "last",
    "strategy_btc_holdings": "last", "sell_fraction": "max",
    "fear_greed_raw": "last", "funding_rate_raw": "last",
    "mvrv_raw": "last", "dxy_raw": "last",
    "hash_rate_raw": "last", "active_addr_raw": "last",
    "puell_raw": "last", "btc_dom_raw": "last",
    "interest_rate_raw": "last", "cpi_raw": "last",
}
agg_dict = {k: v for k, v in agg_dict.items() if k in results.columns}
chart = results.resample("W-SUN").agg(agg_dict).dropna(subset=["close", "risk_score"])

deploy_ts = pd.Timestamp(str(deployment_start))
BLUE, GREEN, RED, GRAY = "#4f7cff", "#34d399", "#f87171", "#8b92a5"
GRID, PAPER, PLOT = "#1e2336", "#0f1117", "#131720"

def base_layout(title: str, y_title: str, **kw) -> dict:
    return dict(
        title=dict(text=title, font=dict(color="#e8eaf0", size=13), x=0),
        paper_bgcolor=PAPER, plot_bgcolor=PLOT,
        font=dict(color=GRAY, size=11),
        xaxis=dict(gridcolor=GRID, showline=False, zeroline=False),
        yaxis=dict(gridcolor=GRID, showline=False, zeroline=False, title=y_title),
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=GRAY), orientation="h", y=1.08),
        hovermode="x unified",
        hoverlabel=dict(bgcolor="#1c2133", font_color="#e8eaf0", bordercolor="#2a2f3e"),
        margin=dict(l=0, r=0, t=44, b=0), height=360, **kw,
    )

def vline(fig):
    fig.add_vline(x=deploy_ts.timestamp()*1000, line_dash="dot", line_color="#3a3f52",
                  line_width=1.5, annotation_text="Live", annotation_font_color=GRAY,
                  annotation_position="top right")

# ── Tabs ──────────────────────────────────────────────────────────────────────

tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "Portfolio", "Risk Score", "On-Chain", "Macro", "Capital Flow"
])

# ── Tab 1: Portfolio ──────────────────────────────────────────────────────────
with tab1:
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=chart.index, y=chart["buy_hold_portfolio"],
        name="Buy & Hold DCA", line=dict(color=GRAY, width=1.5, dash="dot"),
        hovertemplate="%{x|%b %d %Y}<br>Buy & Hold: $%{y:,.0f}<extra></extra>"))
    fig.add_trace(go.Scatter(x=chart.index, y=chart["strategy_portfolio"],
        name="Risk-Managed Strategy", line=dict(color=BLUE, width=2.5),
        fill="tozeroy", fillcolor="rgba(79,124,255,0.06)",
        hovertemplate="%{x|%b %d %Y}<br>Strategy: $%{y:,.0f}<extra></extra>"))
    vline(fig)
    fig.update_layout(**base_layout("Portfolio Value (Weekly)", "Value ($)"))
    fig.update_yaxes(tickprefix="$")
    st.plotly_chart(fig, use_container_width=True)

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Invested",              f"${float(overview['strategy_invested']):,.0f}")
    m2.metric("Cash on Hand",          f"${float(overview['strategy_cash']):,.0f}")
    m3.metric(f"{asset_short} Holdings", f"{float(overview['strategy_btc_holdings']):.6f}")
    m4.metric("Risk/Return Corr",       f"{float(overview['risk_future_corr']):.4f}")

# ── Tab 2: Risk Score ─────────────────────────────────────────────────────────
with tab2:
    fig2 = go.Figure()
    fig2.add_hrect(y0=0, y1=buy_max, fillcolor=GREEN, opacity=0.05, line_width=0)
    fig2.add_hrect(y0=buy_max, y1=sell_start, fillcolor=GRAY, opacity=0.03, line_width=0)
    fig2.add_hrect(y0=sell_start, y1=10, fillcolor=RED, opacity=0.05, line_width=0)
    fig2.add_trace(go.Scatter(x=chart.index, y=chart["risk_score"],
        name="Risk Score", line=dict(color=BLUE, width=2.2),
        hovertemplate="%{x|%b %d %Y}<br>Risk: %{y:.2f}<extra></extra>"))
    buy_m  = chart["strategy_dca"] > 0
    sell_m = chart["strategy_btc_sold"] > 0
    fig2.add_trace(go.Scatter(x=chart.index[buy_m], y=chart.loc[buy_m, "risk_score"],
        mode="markers", name="Buy", marker=dict(color=GREEN, size=7, symbol="circle"),
        customdata=chart.loc[buy_m, "strategy_dca"],
        hovertemplate="%{x|%b %d %Y}<br>Buy: $%{customdata:,.0f}<extra></extra>"))
    fig2.add_trace(go.Scatter(x=chart.index[sell_m], y=chart.loc[sell_m, "risk_score"],
        mode="markers", name="Sell", marker=dict(color=RED, size=9, symbol="triangle-down"),
        customdata=chart.loc[sell_m, "sell_fraction"],
        hovertemplate="%{x|%b %d %Y}<br>Sell: %{customdata:.0%}<extra></extra>"))
    # Buy zone tier lines
    _t = buy_max / 3
    for _y, _label in [(_t, f"${int(amt_high)} tier"), (_t * 2, f"${int(amt_mid)} tier"), (buy_max, f"${int(amt_low)} tier / no buy")]:
        fig2.add_hline(y=_y, line_dash="dot", line_color=GREEN, line_width=0.8,
                       annotation_text=_label, annotation_font_color=GREEN,
                       annotation_font_size=10, annotation_position="right")

    # Sell zone tier lines
    for _y, _label in [
        (sell_start,       "10% sell"),
        (sell_start + 0.5, "20% sell"),
        (sell_start + 1.0, "25% sell"),
        (sell_start + 1.5, "30% sell"),
        (sell_start + 2.0, "40% sell"),
        (sell_start + 2.5, "50% sell"),
    ]:
        if _y <= 10:
            fig2.add_hline(y=_y, line_dash="dot", line_color=RED, line_width=0.8,
                           annotation_text=_label, annotation_font_color=RED,
                           annotation_font_size=10, annotation_position="right")
    vline(fig2)
    fig2.update_layout(**base_layout("Risk Score (Weekly)", "Risk (0–10)"))
    _pad = 0.5
    _risk_min = max(0, chart["risk_score"].min() - _pad)
    _risk_max = min(10, chart["risk_score"].max() + _pad)
    fig2.update_yaxes(range=[_risk_min, _risk_max])
    st.plotly_chart(fig2, use_container_width=True)

    factor_rows = [
        ("MVRV",           f"{weights['mvrv']:.1%}",           "CoinMetrics",    "✓" if data_status["MVRV"] else "–",           "High MVRV = overvalued vs realized cap"),
        ("Network Health", f"{weights['network_health']:.1%}",  "CoinMetrics",    "✓" if data_status["Network Health"] else "–", "Hash Rate + Active Addresses. High = healthy = lower risk"),
        ("Puell Multiple", f"{weights['puell']:.1%}",           "CoinMetrics",    "✓" if data_status["Puell"] else "–",          "Miner revenue / 365d avg. >4 = cycle top"),
        ("Funding Rate",   f"{weights['funding_rate']:.1%}",    "Binance Futures","✓" if data_status["Funding Rate"] else "–",   "High positive rate = overleveraged longs"),
        ("Fear & Greed",   f"{weights['fear_greed']:.1%}",      "alternative.me", "✓" if data_status["Fear & Greed"] else "–",  "Extreme greed (>75) = high risk"),
        ("BTC Dominance",  f"{weights['btc_dominance']:.1%}",   "CoinGecko",      "✓" if data_status["BTC Dominance"] else "–", "Low dominance = altcoin euphoria = late bull"),
        ("Trend",          f"{weights['trend']:.1%}",           "yfinance",       "✓",                                          "RSI-14, price vs MA-20 & MA-200"),
        ("Sentiment",      f"{weights['sentiment']:.1%}",       "yfinance",       "✓",                                          "Z-score of 30-day return"),
        ("Valuation",      f"{weights['valuation']:.1%}",       "yfinance",       "✓",                                          "Log price z-score vs 365-day history"),
        ("Structure",      f"{weights['structure']:.1%}",       "yfinance",       "✓",                                          "30-day annualized volatility"),
        ("Interest Rate",  f"{weights['interest_rate']:.1%}",   "FRED",           "✓" if data_status["Interest Rate"] else "–", "Fed Funds Rate. High = risk-off"),
        ("DXY",            f"{weights['dxy']:.1%}",             "yfinance",       "✓",                                          "Strong USD = headwind for crypto"),
        ("CPI Inflation",  f"{weights['cpi']:.1%}",             "FRED",           "✓" if data_status["CPI"] else "–",           "High YoY CPI → rate hikes → risk-off"),
    ]
    factor_df = pd.DataFrame(factor_rows, columns=["Factor", "Weight", "Source", "Live", "Signal Logic"])
    st.dataframe(factor_df, hide_index=True, use_container_width=True)

# ── Tab 3: On-Chain ───────────────────────────────────────────────────────────
with tab3:
    col_a, col_b = st.columns(2)

    def mini_chart(col, series, title, y_title, color, hlines=None, bar=False):
        s = series.dropna()
        if s.empty:
            col.info(f"{title} — data not available.")
            return
        with col:
            fig = go.Figure()
            if bar:
                colors = [GREEN if v <= 0 else RED for v in s]
                fig.add_trace(go.Bar(x=s.index, y=s, name=title, marker_color=colors, opacity=0.7,
                    hovertemplate="%{x|%b %d %Y}<br>" + title + ": %{y:.4f}<extra></extra>"))
            else:
                fig.add_trace(go.Scatter(x=s.index, y=s, name=title, line=dict(color=color, width=1.8),
                    fill="tozeroy", fillcolor=color.replace(")", ",0.07)").replace("rgb", "rgba"),
                    hovertemplate="%{x|%b %d %Y}<br>" + title + ": %{y:,.2f}<extra></extra>"))
            if hlines:
                for val, c, label in hlines:
                    fig.add_hline(y=val, line_dash="dash", line_color=c, line_width=1,
                                  annotation_text=label, annotation_font_color=c, annotation_position="right")
            layout = base_layout(title, y_title)
            layout["height"] = 300
            fig.update_layout(**layout)
            st.plotly_chart(fig, use_container_width=True)

    with col_a:
        mini_chart(col_a, chart.get("mvrv_raw", pd.Series(dtype=float)),
                   "MVRV Ratio", "MVRV", "#a78bfa",
                   hlines=[(3.5, RED, "Overvalued"), (1.0, GREEN, "Undervalued")])
        mini_chart(col_a, chart.get("puell_raw", pd.Series(dtype=float)),
                   "Puell Multiple", "Puell", "#f59e0b",
                   hlines=[(4.0, RED, "Cycle top zone"), (0.5, GREEN, "Capitulation zone")])
        mini_chart(col_a, chart.get("fear_greed_raw", pd.Series(dtype=float)),
                   "Fear & Greed Index", "Score (0–100)", "#f59e0b",
                   hlines=[(75, RED, "Extreme Greed"), (25, GREEN, "Extreme Fear")])

    with col_b:
        mini_chart(col_b, chart.get("hash_rate_raw", pd.Series(dtype=float)),
                   "Hash Rate", "TH/s", "#38bdf8")
        mini_chart(col_b, chart.get("active_addr_raw", pd.Series(dtype=float)),
                   "Active Addresses", "Addresses", "#818cf8")
        if "btc_dom_raw" in chart.columns:
            mini_chart(col_b, chart.get("btc_dom_raw", pd.Series(dtype=float)),
                       "BTC Dominance", "%", "#fbbf24",
                       hlines=[(60, GREEN, "High dominance"), (40, RED, "Low dominance")])

# ── Tab 4: Macro ──────────────────────────────────────────────────────────────
with tab4:
    col_a, col_b = st.columns(2)

    with col_a:
        ir_series = chart.get("interest_rate_raw", pd.Series(dtype=float)).dropna()
        if not ir_series.empty:
            fig_ir = go.Figure()
            fig_ir.add_trace(go.Scatter(x=ir_series.index, y=ir_series,
                name="Fed Funds Rate", line=dict(color=RED, width=2),
                fill="tozeroy", fillcolor="rgba(248,113,113,0.07)",
                hovertemplate="%{x|%b %d %Y}<br>Rate: %{y:.2f}%<extra></extra>"))
            fig_ir.add_hline(y=5, line_dash="dash", line_color="#f87171", line_width=1,
                             annotation_text="Restrictive (>5%)", annotation_font_color="#f87171", annotation_position="right")
            fig_ir.add_hline(y=2, line_dash="dash", line_color="#34d399", line_width=1,
                             annotation_text="Neutral (~2%)", annotation_font_color="#34d399", annotation_position="right")
            layout = base_layout("Federal Funds Rate", "Rate (%)")
            layout["height"] = 320
            fig_ir.update_layout(**layout)
            st.plotly_chart(fig_ir, use_container_width=True)
        else:
            st.info("Interest rate data not available.")

        dxy_series = chart.get("dxy_raw", pd.Series(dtype=float)).dropna()
        if not dxy_series.empty:
            fig_dxy = go.Figure()
            fig_dxy.add_trace(go.Scatter(x=dxy_series.index, y=dxy_series,
                name="DXY", line=dict(color="#38bdf8", width=2),
                hovertemplate="%{x|%b %d %Y}<br>DXY: %{y:.2f}<extra></extra>"))
            layout = base_layout("US Dollar Index (DXY)", "DXY Level")
            layout["height"] = 300
            fig_dxy.update_layout(**layout)
            st.plotly_chart(fig_dxy, use_container_width=True)
        else:
            st.info("DXY data not available.")

    with col_b:
        cpi_series = chart.get("cpi_raw", pd.Series(dtype=float)).dropna()
        if not cpi_series.empty:
            colors_cpi = [RED if v > 4 else GREEN if v < 2 else "#f59e0b" for v in cpi_series]
            fig_cpi = go.Figure()
            fig_cpi.add_trace(go.Bar(x=cpi_series.index, y=cpi_series,
                name="CPI YoY", marker_color=colors_cpi, opacity=0.75,
                hovertemplate="%{x|%b %d %Y}<br>CPI YoY: %{y:.2f}%<extra></extra>"))
            fig_cpi.add_hline(y=4,   line_dash="dash", line_color=RED,       line_width=1,
                              annotation_text="High inflation (>4%)", annotation_font_color=RED, annotation_position="right")
            fig_cpi.add_hline(y=2,   line_dash="dash", line_color=GREEN,     line_width=1,
                              annotation_text="Fed target (2%)", annotation_font_color=GREEN, annotation_position="right")
            fig_cpi.add_hline(y=0,   line_color=GRAY, line_width=1)
            layout = base_layout("CPI Inflation YoY", "CPI %")
            layout["height"] = 320
            fig_cpi.update_layout(**layout)
            st.plotly_chart(fig_cpi, use_container_width=True)
        else:
            st.info("CPI data not available.")

        fr_series = chart.get("funding_rate_raw", pd.Series(dtype=float)).dropna()
        if not fr_series.empty:
            colors_fr = [GREEN if v <= 0 else RED for v in fr_series]
            fig_fr = go.Figure()
            fig_fr.add_trace(go.Bar(x=fr_series.index, y=fr_series * 100,
                name="Funding Rate", marker_color=colors_fr, opacity=0.7,
                hovertemplate="%{x|%b %d %Y}<br>Rate: %{y:.4f}%<extra></extra>"))
            fig_fr.add_hline(y=0, line_color=GRAY, line_width=1)
            layout = base_layout("Perp Funding Rate (Daily Avg)", "Rate (%)")
            layout["height"] = 300
            fig_fr.update_layout(**layout)
            st.plotly_chart(fig_fr, use_container_width=True)
        else:
            st.info("Funding rate data not available.")

# ── Tab 5: Capital Flow ───────────────────────────────────────────────────────
with tab5:
    fig5 = go.Figure()
    fig5.add_trace(go.Bar(x=chart.index, y=chart["strategy_dca"],
        name="Weekly Buy", marker_color=GREEN, opacity=0.7,
        hovertemplate="%{x|%b %d %Y}<br>Bought: $%{y:,.0f}<extra></extra>"))
    fig5.add_trace(go.Bar(x=chart.index, y=-chart["strategy_sell_proceeds"],
        name="Sell Proceeds", marker_color=RED, opacity=0.7,
        customdata=chart["strategy_sell_proceeds"],
        hovertemplate="%{x|%b %d %Y}<br>Sold: $%{customdata:,.0f}<extra></extra>"))
    fig5.add_trace(go.Scatter(x=chart.index, y=chart["strategy_cash"],
        name="Cash Position", line=dict(color=BLUE, width=2), yaxis="y2",
        hovertemplate="%{x|%b %d %Y}<br>Cash: $%{y:,.0f}<extra></extra>"))
    vline(fig5)
    layout5 = base_layout("Capital Flow (Weekly)", "Weekly Flow ($)", barmode="relative")
    layout5["yaxis2"] = dict(title="Cash ($)", overlaying="y", side="right",
                              gridcolor=GRID, showline=False, zeroline=False, tickprefix="$")
    fig5.update_layout(**layout5)
    st.plotly_chart(fig5, use_container_width=True)

# ── Raw data ──────────────────────────────────────────────────────────────────
with st.expander("View raw data (last 30 rows)"):
    display_cols = [c for c in [
        "close", "risk_score", "risk_used",
        "mvrv_raw", "puell_raw", "hash_rate_raw", "active_addr_raw",
        "fear_greed_raw", "btc_dom_raw", "funding_rate_raw",
        "interest_rate_raw", "cpi_raw", "dxy_raw",
        "strategy_dca", "sell_fraction", "strategy_cash",
        "strategy_portfolio", "buy_hold_portfolio",
    ] if c in results.columns]
    st.dataframe(results[display_cols].tail(30).round(4), use_container_width=True)

st.markdown(
    f"<div style='color:#3a3f52;font-size:0.72rem;margin-top:20px'>"
    f"Price: Yahoo Finance · On-chain: CoinMetrics · Fear & Greed: alternative.me · "
    f"Funding: Binance · Dominance: CoinGecko · Macro: FRED · "
    f"Deploy: {overview['deployment_start']} · Display: {overview['display_start']}"
    f"</div>",
    unsafe_allow_html=True,
)
