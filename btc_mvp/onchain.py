from __future__ import annotations

import threading
import time

import numpy as np
import pandas as pd
import requests
import yfinance as yf


def _timeout(fn, seconds: int = 8):
    """
    Run fn() in a daemon thread; return its result or an empty Series if it
    doesn't finish within `seconds`. Daemon threads are killed when the
    process exits, so hung network calls never block the app permanently.
    """
    result: list = [pd.Series(dtype=float)]
    exc: list = [None]

    def _worker():
        try:
            result[0] = fn()
        except Exception as e:
            exc[0] = e

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    t.join(timeout=seconds)
    return result[0]

BINANCE_SYMBOL_MAP = {
    "BTC-USD": "BTCUSDT",
    "ETH-USD": "ETHUSDT",
    "SOL-USD": "SOLUSDT",
    "BNB-USD": "BNBUSDT",
    "XRP-USD": "XRPUSDT",
}

OKX_SYMBOL_MAP = {
    "BTC-USD": "BTC-USDT-SWAP",
    "ETH-USD": "ETH-USDT-SWAP",
    "SOL-USD": "SOL-USDT-SWAP",
    "BNB-USD": "BNB-USDT-SWAP",
    "XRP-USD": "XRP-USDT-SWAP",
}

COINMETRICS_ASSET_MAP = {
    "BTC-USD": "btc",
    "ETH-USD": "eth",
    "SOL-USD": "sol",
    "BNB-USD": "bnb",
    "XRP-USD": "xrp",
}

COINGECKO_COIN_MAP = {
    "BTC-USD": "bitcoin",
    "ETH-USD": "ethereum",
    "SOL-USD": "solana",
    "BNB-USD": "binancecoin",
    "XRP-USD": "ripple",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get(url: str, params: dict | None = None, timeout: int = 8) -> requests.Response | None:
    try:
        resp = requests.get(url, params=params, timeout=timeout, headers={"accept": "application/json"})
        return resp if resp.status_code in (200, 429) else None
    except Exception:
        return None


def _coinmetrics(asset: str, metrics: list[str]) -> pd.DataFrame:
    resp = _get(
        "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics",
        params={
            "assets": asset,
            "metrics": ",".join(metrics),
            "frequency": "1d",
            "start_time": "2013-01-01",
            "page_size": 10000,
        },
    )
    if resp is None:
        return pd.DataFrame()
    data = resp.json().get("data", [])
    if not data:
        return pd.DataFrame()
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["time"]).dt.tz_localize(None).dt.normalize()
    df = df.set_index("date").drop(columns=["time", "asset"], errors="ignore")
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df.sort_index()


def _fred(series_id: str) -> pd.Series:
    resp = _get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}", timeout=15)
    if resp is None:
        return pd.Series(dtype=float)
    try:
        from io import StringIO
        # FRED renamed the date column from "DATE" to "observation_date" — parse
        # the first column as the date index regardless of its header.
        df = pd.read_csv(StringIO(resp.text), index_col=0, parse_dates=True, na_values=".")
        df.index = pd.DatetimeIndex(df.index).normalize()
        return df.iloc[:, 0].dropna().astype(float).sort_index()
    except Exception:
        return pd.Series(dtype=float)


# ── Existing fetchers ─────────────────────────────────────────────────────────

def fetch_fear_greed(limit: int = 2000) -> pd.Series:
    resp = _get(f"https://api.alternative.me/fng/?limit={limit}&format=json")
    if resp is None:
        return pd.Series(dtype=float)
    try:
        df = pd.DataFrame(resp.json()["data"])
        df["date"] = pd.to_datetime(df["timestamp"].astype(int), unit="s").dt.normalize()
        return df.set_index("date")["value"].astype(float).sort_index()
    except Exception:
        return pd.Series(dtype=float)


def fetch_funding_rate(ticker: str = "BTC-USD") -> pd.Series:
    """
    Fetch perpetual funding rate history from OKX (no API key required, no geo-block).
    Paginates backward ~30 pages (~900 days) using cursor-based 'after' param.
    """
    symbol = OKX_SYMBOL_MAP.get(ticker)
    if not symbol:
        return pd.Series(dtype=float)
    url = "https://www.okx.com/api/v5/public/funding-rate-history"
    all_records: list = []
    cursor: str | None = None
    try:
        for _ in range(3):
            params: dict = {"instId": symbol, "limit": 100}
            if cursor:
                params["after"] = cursor
            resp = _get(url, params=params)
            if resp is None:
                break
            records = resp.json().get("data", [])
            if not records:
                break
            all_records.extend(records)
            if len(records) < 100:
                break
            cursor = str(min(int(r["fundingTime"]) for r in records))
            time.sleep(0.05)
    except Exception:
        pass
    if not all_records:
        return pd.Series(dtype=float)
    df = pd.DataFrame(all_records)
    df["date"] = pd.to_datetime(df["fundingTime"].astype(int), unit="ms").dt.normalize()
    df["fundingRate"] = df["realizedRate"].astype(float)
    return df.groupby("date")["fundingRate"].mean().sort_index()


def fetch_mvrv(ticker: str = "BTC-USD") -> pd.Series:
    asset = COINMETRICS_ASSET_MAP.get(ticker)
    if not asset:
        return pd.Series(dtype=float)
    df = _coinmetrics(asset, ["CapMVRVCur"])
    return df["CapMVRVCur"].dropna() if "CapMVRVCur" in df.columns else pd.Series(dtype=float)


def fetch_dxy(start: str = "2010-01-01") -> pd.Series:
    try:
        data = yf.download("DX-Y.NYB", start=start, auto_adjust=True, progress=False)
        if data.empty:
            return pd.Series(dtype=float)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        col = "Close" if "Close" in data.columns else "close"
        s = data[col].squeeze()
        s.index = pd.DatetimeIndex(s.index).normalize()
        return s.dropna().sort_index()
    except Exception:
        return pd.Series(dtype=float)


# ── New fetchers ──────────────────────────────────────────────────────────────

def fetch_network_health(ticker: str = "BTC-USD") -> pd.DataFrame:
    """
    Returns DataFrame with HashRate and AdrActCnt from CoinMetrics.
    Network health: high hash rate + high active addresses = healthy = lower risk.
    """
    asset = COINMETRICS_ASSET_MAP.get(ticker, "btc")
    df = _coinmetrics(asset, ["HashRate", "AdrActCnt"])
    return df


def fetch_puell_multiple(ticker: str = "BTC-USD") -> pd.Series:
    """
    Puell Multiple = daily miner issuance (USD) / 365-day MA of same.
    High (>4) = miners earning a lot = historical cycle tops.
    Low (<0.5) = miner capitulation = historical bottoms.
    Only meaningful for PoW assets (BTC, LTC). Returns empty for PoS assets.
    """
    asset = COINMETRICS_ASSET_MAP.get(ticker, "btc")
    df = _coinmetrics(asset, ["IssTotUSD"])
    if "IssTotUSD" not in df.columns or df["IssTotUSD"].dropna().empty:
        return pd.Series(dtype=float)
    issuance = df["IssTotUSD"].dropna()
    ma365 = issuance.rolling(365, min_periods=180).mean()
    puell = issuance / ma365
    return puell.replace([np.inf, -np.inf], np.nan).dropna()


def fetch_btc_dominance(days: int = 365) -> pd.Series:
    """
    BTC dominance approximated from BTC vs ETH market caps.
    Primary source: CoinMetrics CapMrktCurUSD (full history since 2013, one call).
    Fallback: CoinGecko, limited to 365 days on the free public API.
    Low BTC dominance = altcoin euphoria = late bull cycle = higher risk.
    """
    resp = _get(
        "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics",
        params={
            "assets": "btc,eth",
            "metrics": "CapMrktCurUSD",
            "frequency": "1d",
            "start_time": "2013-01-01",
            "page_size": 10000,
        },
    )
    if resp is not None:
        try:
            data = resp.json().get("data", [])
            if data:
                df = pd.DataFrame(data)
                df["date"] = pd.to_datetime(df["time"]).dt.tz_localize(None).dt.normalize()
                df["mc"] = pd.to_numeric(df["CapMrktCurUSD"], errors="coerce")
                pivot = df.pivot_table(index="date", columns="asset", values="mc")
                if "btc" in pivot.columns:
                    total = pivot.sum(axis=1)
                    dom = (pivot["btc"] / total * 100).dropna().sort_index()
                    if not dom.empty:
                        return dom
        except Exception:
            pass

    # Fallback: CoinGecko (free public API caps range at 365 days)
    caps: dict[str, pd.Series] = {}
    for coin in ["bitcoin", "ethereum"]:
        resp = _get(
            f"https://api.coingecko.com/api/v3/coins/{coin}/market_chart",
            params={"vs_currency": "usd", "days": min(days, 365), "interval": "daily"},
        )
        if resp is not None and resp.status_code == 200:
            try:
                mc_data = resp.json().get("market_caps", [])
                df = pd.DataFrame(mc_data, columns=["ts", "mc"])
                df["date"] = pd.to_datetime(df["ts"], unit="ms").dt.normalize()
                caps[coin] = df.set_index("date")["mc"].astype(float)
            except Exception:
                pass

    if "bitcoin" not in caps:
        return pd.Series(dtype=float)

    mc_df = pd.DataFrame(caps).dropna(how="all")
    total = mc_df.sum(axis=1)
    return (mc_df["bitcoin"] / total * 100).dropna().sort_index()


def fetch_interest_rate() -> pd.Series:
    """Federal Funds Effective Rate from FRED (monthly). High = tighter = higher risk."""
    return _fred("FEDFUNDS")


def fetch_cpi() -> pd.Series:
    """
    CPI All Urban Consumers from FRED, converted to YoY % change.
    High/rising inflation → rate hikes → risk-off for crypto.
    """
    cpi = _fred("CPIAUCSL")
    if cpi.empty:
        return pd.Series(dtype=float)
    return (cpi.pct_change(12) * 100).dropna()


# ── Bundle ────────────────────────────────────────────────────────────────────

def fetch_all(ticker: str = "BTC-USD") -> dict:
    """
    Run all fetchers in parallel daemon threads, each capped at 7 seconds.
    Uses only stdlib threading — no concurrent.futures — for maximum portability.
    Total wall-clock time ≤ 7s (all threads fire simultaneously).
    """
    fetchers = {
        "fear_greed":     lambda: fetch_fear_greed(),
        "funding_rate":   lambda: fetch_funding_rate(ticker),
        "mvrv":           lambda: fetch_mvrv(ticker),
        "dxy":            lambda: fetch_dxy(),
        "network_health": lambda: fetch_network_health(ticker),
        "puell":          lambda: fetch_puell_multiple(ticker),
        "btc_dominance":  lambda: fetch_btc_dominance(),
        "interest_rate":  lambda: fetch_interest_rate(),
        "cpi":            lambda: fetch_cpi(),
    }

    results: dict = {}

    def _run(key: str, fn) -> None:
        results[key] = _timeout(fn, seconds=7)

    threads = [
        threading.Thread(target=_run, args=(k, fn), daemon=True)
        for k, fn in fetchers.items()
    ]
    for t in threads:
        t.start()

    deadline = time.time() + 9          # 9s outer wall-clock cap
    for t in threads:
        remaining = max(0.0, deadline - time.time())
        t.join(timeout=remaining)

    for key in fetchers:
        if key not in results:
            results[key] = pd.Series(dtype=float)

    return results
