from __future__ import annotations

import time

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

COINMETRICS_ASSET_MAP = {
    "BTC-USD": "btc",
    "ETH-USD": "eth",
    "SOL-USD": "sol",
    "BNB-USD": "bnb",
    "XRP-USD": "xrp",
}


def fetch_fear_greed(limit: int = 2000) -> pd.Series:
    try:
        resp = requests.get(
            f"https://api.alternative.me/fng/?limit={limit}&format=json",
            timeout=15,
        )
        resp.raise_for_status()
        df = pd.DataFrame(resp.json()["data"])
        df["date"] = pd.to_datetime(df["timestamp"].astype(int), unit="s").dt.normalize()
        df["value"] = df["value"].astype(float)
        return df.set_index("date")["value"].sort_index()
    except Exception:
        return pd.Series(dtype=float)


def fetch_funding_rate(ticker: str = "BTC-USD") -> pd.Series:
    symbol = BINANCE_SYMBOL_MAP.get(ticker)
    if not symbol:
        return pd.Series(dtype=float)

    url = "https://fapi.binance.com/fapi/v1/fundingRate"
    all_records: list = []
    end_time: int | None = None

    try:
        for _ in range(20):
            params: dict = {"symbol": symbol, "limit": 1000}
            if end_time:
                params["endTime"] = end_time
            resp = requests.get(url, params=params, timeout=15)
            if resp.status_code != 200:
                break
            records = resp.json()
            if not records:
                break
            all_records.extend(records)
            if len(records) < 1000:
                break
            end_time = int(records[0]["fundingTime"]) - 1
            time.sleep(0.1)
    except Exception:
        pass

    if not all_records:
        return pd.Series(dtype=float)

    df = pd.DataFrame(all_records)
    df["date"] = pd.to_datetime(df["fundingTime"].astype(int), unit="ms").dt.normalize()
    df["fundingRate"] = df["fundingRate"].astype(float)
    return df.groupby("date")["fundingRate"].mean().sort_index()


def fetch_mvrv(ticker: str = "BTC-USD") -> pd.Series:
    asset = COINMETRICS_ASSET_MAP.get(ticker)
    if not asset:
        return pd.Series(dtype=float)
    try:
        url = (
            "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics"
            f"?assets={asset}&metrics=CapMVRVCur&frequency=1d"
            "&start_time=2013-01-01&page_size=10000"
        )
        resp = requests.get(url, timeout=20)
        if resp.status_code != 200:
            return pd.Series(dtype=float)
        data = resp.json().get("data", [])
        if not data:
            return pd.Series(dtype=float)
        df = pd.DataFrame(data)
        df["date"] = pd.to_datetime(df["time"]).dt.tz_localize(None).dt.normalize()
        df["mvrv"] = pd.to_numeric(df["CapMVRVCur"], errors="coerce")
        return df.set_index("date")["mvrv"].dropna().sort_index()
    except Exception:
        return pd.Series(dtype=float)


def fetch_dxy(start: str = "2010-01-01") -> pd.Series:
    try:
        data = yf.download("DX-Y.NYB", start=start, auto_adjust=True, progress=False)
        if data.empty:
            return pd.Series(dtype=float)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        col = "Close" if "Close" in data.columns else "close"
        series = data[col].squeeze()
        series.index = pd.DatetimeIndex(series.index).normalize()
        return series.dropna().sort_index()
    except Exception:
        return pd.Series(dtype=float)


def fetch_all(ticker: str = "BTC-USD") -> dict[str, pd.Series]:
    return {
        "fear_greed":   fetch_fear_greed(),
        "funding_rate": fetch_funding_rate(ticker),
        "mvrv":         fetch_mvrv(ticker),
        "dxy":          fetch_dxy(),
    }
