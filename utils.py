from __future__ import annotations

import numpy as np
import pandas as pd
from ta.momentum import RSIIndicator


def rsi(close: pd.Series, window: int = 14) -> pd.Series:
    return RSIIndicator(close=close, window=window).rsi()


def zscore(series: pd.Series, window: int) -> pd.Series:
    mean = series.rolling(window, min_periods=window).mean()
    std = series.rolling(window, min_periods=window).std()
    return ((series - mean) / std.replace(0, np.nan)).replace([np.inf, -np.inf], np.nan)


def rolling_percentile(series: pd.Series, window: int) -> pd.Series:
    def percentile(values: pd.Series) -> float:
        return values.rank(pct=True).iloc[-1]

    return series.rolling(window, min_periods=window).apply(percentile, raw=False)


def minmax_scale_100(series: pd.Series) -> pd.Series:
    expanding_min = series.expanding(min_periods=1).min()
    expanding_max = series.expanding(min_periods=1).max()
    scaled = (series - expanding_min) / (expanding_max - expanding_min)
    return (scaled * 100).clip(0, 100).fillna(50)


def annualized_return(equity: pd.Series, periods_per_year: int = 365) -> float:
    if equity.empty or len(equity) < 2:
        return 0.0
    years = len(equity) / periods_per_year
    return (equity.iloc[-1] / equity.iloc[0]) ** (1 / years) - 1


def max_drawdown(equity: pd.Series) -> float:
    peak = equity.cummax()
    drawdown = equity / peak - 1
    return float(drawdown.min())


def correlation(a: pd.Series, b: pd.Series) -> float:
    aligned = pd.concat([a, b], axis=1).dropna()
    if len(aligned) < 2:
        return 0.0
    return float(aligned.iloc[:, 0].corr(aligned.iloc[:, 1]))


def format_pct(value: float) -> str:
    return f"{value * 100:,.2f}%"
