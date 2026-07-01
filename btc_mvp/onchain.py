from __future__ import annotations

import time

import numpy as np
import pandas as pd
import requests
import yfinance as yf

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
        df = pd.read_csv(StringIO(resp.text), parse_dates=["DATE"], index_col="DATE", na_values=".")
        df.index = df.index.normalize()
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
        for _ in range(10):
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


def fetch_btc_dominance(days: int = 1095) -> pd.Series:
    """
    Approximates BTC dominance using market caps of BTC + top 4 altcoins via CoinGecko.
    Low dominance = altcoin euphoria = late bull cycle = higher risk for all crypto.
    Retries on 429 (rate limit) with exponential backoff.
    """
    coins = ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"]
    caps: dict[str, pd.Series] = {}

    for coin in coins:
        for attempt in range(3):
            resp = _get(
                f"https://api.coingecko.com/api/v3/coins/{coin}/market_chart",
                params={"vs_currency": "usd", "days": days, "interval": "daily"},
            )
            if resp is not None and resp.status_code == 429:
                time.sleep(8 * (attempt + 1))
                continue
            if resp is not None:
                try:
                    mc_data = resp.json().get("market_caps", [])
                    df = pd.DataFrame(mc_data, columns=["ts", "mc"])
                    df["date"] = pd.to_datetime(df["ts"], unit="ms").dt.normalize()
                    caps[coin] = df.set_index("date")["mc"].astype(float)
                except Exception:
                    pass
            break
        time.sleep(0.5)

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
    Fetch all external data sources in parallel.
    Hard wall-clock cap: 20s. Any source not done by then gets an empty Series.
    Uses shutdown(wait=False) so hung network threads never block the return.
    """
    from concurrent.futures import ThreadPoolExecutor, wait as cf_wait, FIRST_COMPLETED

    tasks = {
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

    pool = ThreadPoolExecutor(max_workers=9)
    futures = {pool.submit(fn): key for key, fn in tasks.items()}

    done, _ = cf_wait(futures, timeout=20)

    # Don't wait for hung threads — let them finish in background
    pool.shutdown(wait=False)

    results: dict = {}
    for future in done:
        key = futures[future]
        try:
            results[key] = future.result()
        except Exception:
            results[key] = pd.Series(dtype=float)

    # Fill any keys that didn't finish within the timeout
    for key in tasks:
        if key not in results:
            results[key] = pd.Series(dtype=float)

    return results
