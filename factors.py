from __future__ import annotations

import numpy as np
import pandas as pd

from utils import minmax_scale_100, rsi, zscore


def add_factors(data: pd.DataFrame) -> pd.DataFrame:
    df = data.copy()

    df["return"] = df["close"].pct_change()
    df["log_price"] = np.log(df["close"])
    df["price_zscore"] = zscore(df["log_price"], 365)
    df["valuation_attractiveness_raw"] = -df["price_zscore"]
    df["valuation_attractiveness"] = minmax_scale_100(df["valuation_attractiveness_raw"])
    df["valuation"] = 100 - df["valuation_attractiveness"]

    df["rsi_14"] = rsi(df["close"], 14)
    df["rsi_normalized"] = (df["rsi_14"] / 100).clip(0, 1)
    df["ma_20"] = df["close"].rolling(20).mean()
    df["ma_200"] = df["close"].rolling(200).mean()
    df["price_vs_ma20"] = df["close"] / df["ma_20"] - 1
    df["price_vs_ma200"] = df["close"] / df["ma_200"] - 1
    df["trend_raw"] = df[["rsi_normalized", "price_vs_ma20", "price_vs_ma200"]].mean(axis=1)
    df["trend"] = minmax_scale_100(df["trend_raw"])

    df["volatility_30"] = df["return"].rolling(30).std() * np.sqrt(365)
    df["structure_raw"] = -zscore(df["volatility_30"], 365)
    df["structure_health"] = minmax_scale_100(df["structure_raw"])
    df["structure"] = 100 - df["structure_health"]

    df["return_30"] = df["close"].pct_change(30)
    df["sentiment_raw"] = zscore(df["return_30"], 365)
    df["sentiment"] = minmax_scale_100(df["sentiment_raw"])

    return df.dropna()


def add_risk_and_allocation(
    data: pd.DataFrame,
    weights: dict[str, float] | None = None,
) -> pd.DataFrame:
    df = data.copy()

    # Full target weights (13-factor model — new factors added as data sources are integrated):
    # MVRV:18, NetworkHealth:1, PuellMultiple:8, FundingRate:7, FearGreed:12,
    # BTCDominance:4, Trend:8, Sentiment:6, Valuation:12, Structure:8, InterestRate:4, DXY:3, CPI:4
    w = weights or {"valuation": 12, "trend": 8, "structure": 8, "sentiment": 6}
    total = sum(w.values())
    if total > 0:
        w = {k: v / total for k, v in w.items()}

    df["risk_raw"] = (
        w["valuation"] * df["valuation"]
        + w["trend"] * df["trend"]
        + w["structure"] * df["structure"]
        + w["sentiment"] * df["sentiment"]
    ).clip(0, 100)
    df["risk_score"] = (df["risk_raw"] / 10).clip(0, 10)

    return df
