from __future__ import annotations

import pandas as pd
import yfinance as yf


def load_btc_data(start: str = "2013-01-01") -> pd.DataFrame:
    data = yf.download(
        "BTC-USD",
        start=start,
        auto_adjust=True,
        progress=False,
        interval="1d",
    )

    if data.empty:
        raise RuntimeError("No BTC-USD data returned from Yahoo Finance.")

    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    data = data.rename(columns=str.lower)
    data.columns.name = None
    required = ["open", "high", "low", "close", "volume"]
    return data[required].dropna()
