from __future__ import annotations

import numpy as np
import pandas as pd

from utils import minmax_scale_100, rsi, zscore


def add_factors(data: pd.DataFrame, external: dict[str, pd.Series] | None = None) -> pd.DataFrame:
    df = data.copy()

    # ── Price-based factors ───────────────────────────────────────────────────
    df["return"] = df["close"].pct_change()
    df["log_price"] = np.log(df["close"])
    df["price_zscore"] = zscore(df["log_price"], 365)
    df["valuation"] = minmax_scale_100(df["price_zscore"])

    df["rsi_14"] = rsi(df["close"], 14)
    df["rsi_normalized"] = (df["rsi_14"] / 100).clip(0, 1)
    df["ma_20"] = df["close"].rolling(20).mean()
    df["ma_200"] = df["close"].rolling(200).mean()
    df["price_vs_ma20"] = df["close"] / df["ma_20"] - 1
    df["price_vs_ma200"] = df["close"] / df["ma_200"] - 1
    df["trend_raw"] = df[["rsi_normalized", "price_vs_ma20", "price_vs_ma200"]].mean(axis=1)
    df["trend"] = minmax_scale_100(df["trend_raw"])

    df["volatility_30"] = df["return"].rolling(30).std() * np.sqrt(365)
    df["structure"] = minmax_scale_100(zscore(df["volatility_30"], 365))

    df["return_30"] = df["close"].pct_change(30)
    df["sentiment"] = minmax_scale_100(zscore(df["return_30"], 365))

    # ── External factors ──────────────────────────────────────────────────────
    ext = external or {}

    def _safe_join(base: pd.DataFrame, series: pd.Series, name: str) -> pd.DataFrame:
        """Join a Series onto base, stripping timezone from both sides first."""
        s = series.copy()
        if hasattr(s.index, "tz") and s.index.tz is not None:
            s.index = s.index.tz_localize(None)
        s.index = s.index.normalize()
        return base.join(s.rename(name), how="left")

    # Fear & Greed (0 = fear/low risk, 100 = greed/high risk — use directly)
    fg = ext.get("fear_greed", pd.Series(dtype=float))
    if not fg.empty:
        df = _safe_join(df, fg, "fear_greed_raw")
        df["fear_greed_raw"] = df["fear_greed_raw"].ffill().fillna(50.0)
    else:
        df["fear_greed_raw"] = 50.0
    df["fear_greed"] = df["fear_greed_raw"].clip(0, 100)

    # Funding rate (positive = longs paying = high leverage = high risk)
    fr = ext.get("funding_rate", pd.Series(dtype=float))
    if not fr.empty:
        df = _safe_join(df, fr, "funding_rate_raw")
        df["funding_rate_raw"] = df["funding_rate_raw"].ffill().fillna(0.0)
    else:
        df["funding_rate_raw"] = 0.0
    df["funding_rate"] = minmax_scale_100(zscore(df["funding_rate_raw"], 365))

    # MVRV (high MVRV = overvalued vs realized cap = high risk)
    mvrv = ext.get("mvrv", pd.Series(dtype=float))
    if not mvrv.empty:
        df = _safe_join(df, mvrv, "mvrv_raw")
        df["mvrv_raw"] = df["mvrv_raw"].ffill()
        df["mvrv"] = minmax_scale_100(df["mvrv_raw"])
    else:
        df["mvrv_raw"] = np.nan
        df["mvrv"] = 50.0

    # DXY (high dollar = macro headwind for crypto = high risk)
    dxy = ext.get("dxy", pd.Series(dtype=float))
    if not dxy.empty:
        df = _safe_join(df, dxy, "dxy_raw")
        df["dxy_raw"] = df["dxy_raw"].ffill()
        df["dxy"] = minmax_scale_100(zscore(df["dxy_raw"], 365))
    else:
        df["dxy_raw"] = np.nan
        df["dxy"] = 50.0

    return df.dropna(subset=["close", "valuation", "trend", "structure", "sentiment"])


def add_risk_and_allocation(
    data: pd.DataFrame,
    weights: dict[str, float] | None = None,
) -> pd.DataFrame:
    df = data.copy()

    default_weights = {
        "mvrv":         0.22,
        "valuation":    0.18,
        "trend":        0.13,
        "fear_greed":   0.12,
        "funding_rate": 0.12,
        "structure":    0.10,
        "sentiment":    0.08,
        "dxy":          0.05,
    }
    w = weights or default_weights
    total = sum(w.values())
    if total > 0:
        w = {k: v / total for k, v in w.items()}

    df["risk_raw"] = (
        w["mvrv"]         * df["mvrv"]
        + w["valuation"]    * df["valuation"]
        + w["trend"]        * df["trend"]
        + w["fear_greed"]   * df["fear_greed"]
        + w["funding_rate"] * df["funding_rate"]
        + w["structure"]    * df["structure"]
        + w["sentiment"]    * df["sentiment"]
        + w["dxy"]          * df["dxy"]
    ).clip(0, 100)

    df["risk_score"] = (df["risk_raw"] / 10).clip(0, 10)

    return df
