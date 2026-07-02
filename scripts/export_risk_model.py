"""Run the v2 BTC risk model and publish a JSON snapshot for the native
Next.js risk-model page. Becomes the daily cron job.

Output: website/lib/risk-model-data.json
Run from repo root:  python scripts/export_risk_model.py
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "btc_mvp"))

import pandas as pd  # noqa: E402

import onchain  # noqa: E402
from data import load_btc_data  # noqa: E402
from factors import DEFAULT_WEIGHTS, MODEL_VERSION, add_factors, add_risk_and_allocation  # noqa: E402

OUT_PATH = os.path.join(REPO, "website", "lib", "risk-model-data.json")

# Display metadata per factor — mirrors the /methodology page tiers.
FACTOR_META = {
    "mvrv":           ("MVRV Ratio",         "Valuation core",       "CoinMetrics"),
    "valuation":      ("Valuation",          "Valuation core",       "Price history"),
    "pi_cycle":       ("Pi-Cycle Top",       "Valuation core",       "Price history"),
    "puell":          ("Puell Multiple",     "Valuation core",       "CoinMetrics"),
    "mayer":          ("Mayer Multiple",     "Valuation core",       "Price history"),
    "fear_greed":     ("Fear & Greed",       "Sentiment & momentum", "alternative.me"),
    "trend":          ("Trend",              "Sentiment & momentum", "Price history"),
    "sentiment":      ("Sentiment",          "Sentiment & momentum", "Price history"),
    "btc_dominance":  ("BTC Dominance",      "Macro & context",      "CoinMetrics"),
    "structure":      ("Structure",          "Macro & context",      "Price history"),
    "network_health": ("Network Health",     "Macro & context",      "CoinMetrics"),
    "dxy":            ("US Dollar (DXY)",    "Macro & context",      "Market data"),
    "cpi":            ("CPI Inflation",      "Macro & context",      "FRED"),
}


def zone_for(score: float) -> dict:
    if score < 3:
        return {"key": "accumulate", "label": "Accumulate", "color": "green"}
    if score <= 6:
        return {"key": "hold", "label": "Hold", "color": "amber"}
    return {"key": "reduce", "label": "Reduce", "color": "red"}


def main() -> None:
    print("Loading BTC price history...")
    price = load_btc_data(start="2013-01-01")

    print("Fetching factor feeds...")
    fetchers = {
        "fear_greed": lambda: onchain.fetch_fear_greed(),
        "funding_rate": lambda: onchain.fetch_funding_rate("BTC-USD"),
        "mvrv": lambda: onchain.fetch_mvrv("BTC-USD"),
        "dxy": lambda: onchain.fetch_dxy(),
        "network_health": lambda: onchain.fetch_network_health("BTC-USD"),
        "puell": lambda: onchain.fetch_puell_multiple("BTC-USD"),
        "btc_dominance": lambda: onchain.fetch_btc_dominance(),
        "interest_rate": lambda: onchain.fetch_interest_rate(),
        "cpi": lambda: onchain.fetch_cpi(),
    }
    external, loaded, defaulted = {}, [], []
    for name, fn in fetchers.items():
        try:
            s = fn()
        except Exception as e:
            print(f"  {name} failed: {e}")
            s = pd.Series(dtype=float)
        external[name] = s
        empty = s.empty if hasattr(s, "empty") else True
        (defaulted if empty else loaded).append(name)

    print("Computing factors + risk score (v%s)..." % MODEL_VERSION)
    df = add_factors(price, external)
    signals = add_risk_and_allocation(df, DEFAULT_WEIGHTS)

    latest = signals.iloc[-1]
    latest_date = signals.index[-1]
    score = round(float(latest["risk_score"]), 2)

    # Per-factor breakdown (weights already normalized to sum 1.0)
    factors = []
    for col, w in DEFAULT_WEIGHTS.items():
        name, tier, source = FACTOR_META[col]
        value = float(latest[col]) if col in signals.columns and pd.notna(latest[col]) else 50.0
        factors.append({
            "key": col,
            "name": name,
            "tier": tier,
            "source": source,
            "value": round(value, 1),          # 0-100, high = high risk
            "weight": round(float(w), 4),      # fraction of the composite
            "contribution": round(w * value / 10, 3),  # points added to the 0-10 score
        })

    # Weekly history of the composite score + BTC close (for the interactive chart)
    weekly = signals[["risk_score", "close"]].resample("W-SUN").last().dropna()
    history = [
        {
            "date": idx.strftime("%Y-%m-%d"),
            "score": round(float(row["risk_score"]), 2),
            "price": round(float(row["close"]), 2),
        }
        for idx, row in weekly.iterrows()
    ]

    out = {
        "asset": "BTC",
        "modelVersion": MODEL_VERSION,
        "generatedAt": date.today().isoformat(),
        "asOf": latest_date.strftime("%Y-%m-%d"),
        "score": score,
        "zone": zone_for(score),
        "factors": factors,
        "history": history,
        "dataNotes": {
            "feedsLoaded": sorted(loaded),
            "feedsDefaulted": sorted(defaulted),
            "priceStart": str(price.index.min().date()),
            "priceEnd": str(price.index.max().date()),
        },
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(out, f, indent=2)

    print(f"\nWrote {OUT_PATH}")
    print(f"  score {score}/10 -> {out['zone']['label']}  (as of {out['asOf']})")
    print(f"  factors: {len(factors)} | history points: {len(history)}")
    print(f"  feeds defaulted: {out['dataNotes']['feedsDefaulted'] or 'none'}")
    # sanity: contributions should sum to score
    csum = round(sum(f["contribution"] for f in factors), 2)
    print(f"  sum(contributions)={csum}  (should ~= {score})")


if __name__ == "__main__":
    main()
