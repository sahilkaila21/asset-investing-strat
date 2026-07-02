from __future__ import annotations

import numpy as np
import pandas as pd

from utils import minmax_scale_100, rsi, zscore


def _safe_join(base: pd.DataFrame, series: pd.Series, name: str) -> pd.DataFrame:
    s = series.copy()
    if hasattr(s.index, "tz") and s.index.tz is not None:
        s.index = s.index.tz_localize(None)
    s.index = s.index.normalize()
    return base.join(s.rename(name), how="left")


def add_factors(data: pd.DataFrame, external: dict | None = None) -> pd.DataFrame:
    df = data.copy()
    ext = external or {}

    # ── Price-based factors (0–100, high = high risk) ─────────────────────────

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

    # ── Pi-Cycle Top (111DMA vs 2x350DMA; approaches/exceeds 1 at cycle tops) ──
    df["pi_cycle_raw"] = df["close"].rolling(111).mean() / (df["close"].rolling(350).mean() * 2)
    df["pi_cycle"] = minmax_scale_100(df["pi_cycle_raw"])

    # ── Mayer Multiple (price / 200DMA; high = overextended = high risk) ───────
    df["mayer_raw"] = df["close"] / df["close"].rolling(200).mean()
    df["mayer"] = minmax_scale_100(df["mayer_raw"])

    # ── Fear & Greed (0 = fear/low risk → 100 = greed/high risk) ─────────────
    fg = ext.get("fear_greed", pd.Series(dtype=float))
    if not fg.empty:
        df = _safe_join(df, fg, "fear_greed_raw")
        df["fear_greed_raw"] = df["fear_greed_raw"].ffill().fillna(50.0)
    else:
        df["fear_greed_raw"] = 50.0
    df["fear_greed"] = df["fear_greed_raw"].clip(0, 100)

    # ── Funding Rate (positive = overleveraged longs = high risk) ─────────────
    fr = ext.get("funding_rate", pd.Series(dtype=float))
    if not fr.empty:
        df = _safe_join(df, fr, "funding_rate_raw")
        df["funding_rate_raw"] = df["funding_rate_raw"].ffill().fillna(0.0)
    else:
        df["funding_rate_raw"] = 0.0
    df["funding_rate"] = minmax_scale_100(zscore(df["funding_rate_raw"], 365))

    # ── MVRV (high = overvalued vs realized cap = high risk) ─────────────────
    mvrv = ext.get("mvrv", pd.Series(dtype=float))
    if not mvrv.empty:
        df = _safe_join(df, mvrv, "mvrv_raw")
        df["mvrv_raw"] = df["mvrv_raw"].ffill()
        df["mvrv"] = minmax_scale_100(df["mvrv_raw"])
    else:
        df["mvrv_raw"] = np.nan
        df["mvrv"] = 50.0

    # ── DXY (strong dollar = crypto headwind = high risk) ────────────────────
    dxy = ext.get("dxy", pd.Series(dtype=float))
    if not dxy.empty:
        df = _safe_join(df, dxy, "dxy_raw")
        df["dxy_raw"] = df["dxy_raw"].ffill()
        df["dxy"] = minmax_scale_100(zscore(df["dxy_raw"], 365))
    else:
        df["dxy_raw"] = np.nan
        df["dxy"] = 50.0

    # ── Network Health: Hash Rate + Active Addresses ──────────────────────────
    # High hash rate + high active addresses = healthy network = LOWER risk
    nh = ext.get("network_health", pd.DataFrame())
    if not nh.empty and "HashRate" in nh.columns:
        df = df.join(nh["HashRate"].rename("hash_rate_raw"), how="left")
        df["hash_rate_raw"] = df["hash_rate_raw"].ffill()
        hash_risk = 100 - minmax_scale_100(zscore(df["hash_rate_raw"], 365))
    else:
        df["hash_rate_raw"] = np.nan
        hash_risk = pd.Series(50.0, index=df.index)

    if not nh.empty and "AdrActCnt" in nh.columns:
        df = df.join(nh["AdrActCnt"].rename("active_addr_raw"), how="left")
        df["active_addr_raw"] = df["active_addr_raw"].ffill()
        addr_risk = 100 - minmax_scale_100(zscore(df["active_addr_raw"], 365))
    else:
        df["active_addr_raw"] = np.nan
        addr_risk = pd.Series(50.0, index=df.index)

    df["network_health"] = ((hash_risk + addr_risk) / 2).clip(0, 100)

    # ── Puell Multiple (high = miners earning a lot = cycle top = high risk) ──
    puell = ext.get("puell", pd.Series(dtype=float))
    if not puell.empty:
        df = _safe_join(df, puell, "puell_raw")
        df["puell_raw"] = df["puell_raw"].ffill()
        df["puell"] = minmax_scale_100(df["puell_raw"])
    else:
        df["puell_raw"] = np.nan
        df["puell"] = 50.0

    # ── BTC Dominance (low dominance = altcoin euphoria = late bull = high risk)
    dom = ext.get("btc_dominance", pd.Series(dtype=float))
    if not dom.empty:
        df = _safe_join(df, dom, "btc_dom_raw")
        df["btc_dom_raw"] = df["btc_dom_raw"].ffill()
        # Invert: low dominance → high risk
        df["btc_dominance"] = 100 - minmax_scale_100(df["btc_dom_raw"])
    else:
        df["btc_dom_raw"] = np.nan
        df["btc_dominance"] = 50.0

    # ── Interest Rate: Fed Funds (high rate = risk-off = high risk) ───────────
    ir = ext.get("interest_rate", pd.Series(dtype=float))
    if not ir.empty:
        df = _safe_join(df, ir, "interest_rate_raw")
        df["interest_rate_raw"] = df["interest_rate_raw"].ffill().bfill().fillna(2.0)
        df["interest_rate"] = minmax_scale_100(df["interest_rate_raw"])
    else:
        df["interest_rate_raw"] = 2.0
        df["interest_rate"] = 50.0

    # ── CPI YoY (high inflation → rate hikes → risk-off = high risk) ─────────
    cpi = ext.get("cpi", pd.Series(dtype=float))
    if not cpi.empty:
        df = _safe_join(df, cpi, "cpi_raw")
        df["cpi_raw"] = df["cpi_raw"].ffill().bfill().fillna(2.0)
        df["cpi"] = minmax_scale_100(df["cpi_raw"].clip(lower=0))
    else:
        df["cpi_raw"] = 2.0
        df["cpi"] = 50.0

    return df.dropna(subset=["close", "valuation", "trend", "structure", "sentiment"])


# ── Model version & changelog ─────────────────────────────────────────────────
# v2.0 (2026-07-02): Factor audit against externally-known cycle turning points
#   (2017/2021 tops, 2018/2022 bottoms). See methodology page for the writeup.
#   - REMOVED interest_rate (spread -66: Fed Funds peaked at the 2022 bottom, so
#     as constructed it read HIGHER risk at bottoms than tops — backwards for
#     crypto cycle timing) and funding_rate (flat: OKX free history is ~95d vs
#     the 365d z-score window, so it sat near a constant 50).
#   - ADDED pi_cycle (111DMA / 2*350DMA; best top discriminator, spread 65) and
#     mayer (price / 200DMA; spread 40). Both price-only, no new data dependency.
#   - Reweighted into theory-driven tiers (NOT backtest-optimized). Previously
#     ~41% of weight sat on non-discriminating factors, compressing the composite
#     into 3-6 and making the "accumulate" zone unreachable (0% of weeks).
#   NUPL and MVRV Z-Score were evaluated and REJECTED as collinear with MVRV
#   (NUPL = 1 - 1/MVRV exactly; MVRV-Z scaled worse than the raw MVRV factor).
# v1.0: original 13-factor set.
MODEL_VERSION = "2.0"

# Default weights — sum to 1.0. Grouped by conviction tier.
DEFAULT_WEIGHTS: dict[str, float] = {
    # Tier 1 — validated valuation core (0.56)
    "mvrv":           0.16,
    "valuation":      0.12,
    "pi_cycle":       0.12,
    "puell":          0.08,
    "mayer":          0.08,
    # Tier 2 — sentiment & momentum (0.24)
    "fear_greed":     0.12,
    "trend":          0.08,
    "sentiment":      0.04,
    # Tier 3 — macro / context, demoted but retained (0.20)
    "btc_dominance":  0.05,
    "structure":      0.05,
    "network_health": 0.04,
    "dxy":            0.03,
    "cpi":            0.03,
}


def add_risk_and_allocation(
    data: pd.DataFrame,
    weights: dict[str, float] | None = None,
) -> pd.DataFrame:
    df = data.copy()
    w = weights or DEFAULT_WEIGHTS
    total = sum(w.values())
    if total > 0:
        w = {k: v / total for k, v in w.items()}

    factor_cols = list(w.keys())
    for col in factor_cols:
        if col not in df.columns:
            df[col] = 50.0

    df["risk_raw"] = sum(w[col] * df[col] for col in factor_cols).clip(0, 100)
    df["risk_score"] = (df["risk_raw"] / 10).clip(0, 10)
    return df
