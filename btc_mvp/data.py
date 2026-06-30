from __future__ import annotations

import time

import pandas as pd
import yfinance as yf

SUPPORTED_ASSETS = {
    "Bitcoin (BTC)": "BTC-USD",
    "Ethereum (ETH)": "ETH-USD",
    "Solana (SOL)": "SOL-USD",
    "BNB": "BNB-USD",
    "XRP": "XRP-USD",
}


def load_asset_data(ticker: str = "BTC-USD", start: str = "2013-01-01", retries: int = 3) -> pd.DataFrame:
    last_error: Exception | None = None

    for attempt in range(retries):
        try:
            data = yf.download(
                ticker,
                start=start,
                auto_adjust=True,
                progress=False,
                interval="1d",
            )

            if data.empty:
                raise RuntimeError(f"No data returned for {ticker} from Yahoo Finance.")

            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.get_level_values(0)

            data = data.rename(columns=str.lower)
            data.columns.name = None
            required = ["open", "high", "low", "close", "volume"]
            missing = [c for c in required if c not in data.columns]
            if missing:
                raise RuntimeError(f"Missing columns after download: {missing}")

            return data[required].dropna()

        except Exception as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(2 ** attempt)

    raise RuntimeError(
        f"Failed to load {ticker} data after {retries} attempts. Last error: {last_error}"
    )


def load_btc_data(start: str = "2013-01-01") -> pd.DataFrame:
    return load_asset_data("BTC-USD", start=start)
