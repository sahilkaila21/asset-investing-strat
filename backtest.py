from __future__ import annotations

import pandas as pd

from utils import correlation, format_pct, max_drawdown


def weekly_strategy_amount(
    risk_score: float,
    buy_max: float = 3.0,
    amounts: tuple[float, float, float] = (600.0, 400.0, 200.0),
) -> float:
    if pd.isna(risk_score) or buy_max <= 0:
        return 0.0
    tier = buy_max / 3
    if risk_score < tier:
        return amounts[0]
    if risk_score < tier * 2:
        return amounts[1]
    if risk_score < buy_max:
        return amounts[2]
    return 0.0


def sell_fraction_for_risk(risk_score: float, sell_start: float = 6.0) -> float:
    if pd.isna(risk_score) or risk_score < sell_start:
        return 0.0
    if risk_score < sell_start + 0.5:
        return 0.10
    if risk_score < sell_start + 1.0:
        return 0.20
    if risk_score < sell_start + 1.5:
        return 0.25
    if risk_score < sell_start + 2.0:
        return 0.30
    if risk_score < sell_start + 2.5:
        return 0.40
    return 0.50


def build_overview(
    results: pd.DataFrame,
    buy_max: float = 3.0,
    amounts: tuple[float, float, float] = (600.0, 400.0, 200.0),
    sell_start: float = 6.0,
) -> dict[str, float | str]:
    latest_risk = float(results["risk_score"].iloc[-1])
    next_sunday_amount = weekly_strategy_amount(latest_risk, buy_max, amounts)
    current_sell_fraction = sell_fraction_for_risk(latest_risk, sell_start)
    strategy_final = float(results["strategy_portfolio"].iloc[-1])
    buy_hold_final = float(results["buy_hold_portfolio"].iloc[-1])
    strategy_dd = max_drawdown(results["strategy_portfolio"])
    buy_hold_dd = max_drawdown(results["buy_hold_portfolio"])
    future_return = results["close"].pct_change().shift(-1)
    risk_future_corr = correlation(results["risk_score"], future_return)

    return {
        "latest_risk": latest_risk,
        "next_sunday_amount": next_sunday_amount,
        "current_sell_fraction": current_sell_fraction,
        "strategy_final": strategy_final,
        "buy_hold_final": buy_hold_final,
        "strategy_invested": float(results["strategy_invested"].iloc[-1]),
        "buy_hold_invested": float(results["buy_hold_invested"].iloc[-1]),
        "strategy_btc_holdings": float(results["strategy_btc_holdings"].iloc[-1]),
        "strategy_cash": float(results["strategy_cash"].iloc[-1]),
        "starting_cash": float(results["starting_cash"].iloc[-1]),
        "deployment_start": str(results["deployment_start"].iloc[-1]),
        "display_start": str(results["display_start"].iloc[-1]),
        "strategy_dd": strategy_dd,
        "buy_hold_dd": buy_hold_dd,
        "risk_future_corr": risk_future_corr,
        "overview_text": (
            f"Verified run succeeded. Latest signal showed risk around {latest_risk:.2f}, "
            f"so current buy signal is ${next_sunday_amount:,.0f} and sell tier is "
            f"{current_sell_fraction:.0%}."
        ),
    }


def run_backtest(
    data: pd.DataFrame,
    starting_cash: float = 30_000.0,
    deployment_start: str = "2026-06-01",
    display_start: str = "2020-01-01",
    benchmark_weekly_dca: float = 200.0,
    buy_max: float = 3.0,
    amounts: tuple[float, float, float] = (600.0, 400.0, 200.0),
    sell_start: float = 6.0,
) -> pd.DataFrame:
    df = data.copy()
    df["risk_used"] = df["risk_score"].shift(1)
    df = df.loc[pd.Timestamp(display_start) :].copy()
    if df.empty:
        raise ValueError(f"No data available on or after display_start={display_start}.")

    active = df.index >= pd.Timestamp(deployment_start)
    df["is_sunday"] = df.index.dayofweek == 6
    df["strategy_dca"] = 0.0
    df.loc[df["is_sunday"] & active, "strategy_dca"] = (
        df.loc[df["is_sunday"] & active, "risk_used"].apply(
            lambda r: weekly_strategy_amount(r, buy_max, amounts)
        )
    )
    df["strategy_dca"] = df["strategy_dca"].clip(upper=starting_cash)

    df["buy_hold_dca"] = 0.0
    df.loc[df["is_sunday"] & active, "buy_hold_dca"] = benchmark_weekly_dca
    df["buy_hold_dca"] = df["buy_hold_dca"].clip(upper=starting_cash)

    df["starting_cash"] = starting_cash
    df["deployment_start"] = deployment_start
    df["display_start"] = display_start

    df["buy_hold_btc_bought"] = 0.0
    df["buy_hold_btc_holdings"] = 0.0
    df["buy_hold_cash"] = 0.0
    df["buy_hold_portfolio"] = 0.0
    df["buy_hold_invested"] = 0.0

    df["sell_fraction"] = df["risk_used"].apply(lambda r: sell_fraction_for_risk(r, sell_start))
    df["previous_sell_fraction"] = df["sell_fraction"].shift(1).fillna(0)
    df["sell_trigger"] = df["sell_fraction"] > df["previous_sell_fraction"]
    df["strategy_btc_bought"] = 0.0
    df["strategy_btc_sold"] = 0.0
    df["strategy_sell_proceeds"] = 0.0
    df["strategy_btc_holdings"] = 0.0
    df["strategy_cash"] = 0.0
    df["strategy_portfolio"] = 0.0
    df["strategy_invested"] = 0.0

    strategy_btc_holdings = 0.0
    strategy_cash = starting_cash
    strategy_invested = 0.0
    buy_hold_btc_holdings = 0.0
    buy_hold_cash = starting_cash
    buy_hold_invested = 0.0

    for index, row in df.iterrows():
        close = float(row["close"])
        buy_amount = min(float(row["strategy_dca"]), strategy_cash)
        btc_bought = buy_amount / close if buy_amount > 0 else 0.0
        strategy_btc_holdings += btc_bought
        strategy_cash -= buy_amount
        strategy_invested += buy_amount

        btc_sold = 0.0
        sell_proceeds = 0.0
        if bool(row["sell_trigger"]) and strategy_btc_holdings > 0:
            btc_sold = strategy_btc_holdings * float(row["sell_fraction"])
            sell_proceeds = btc_sold * close
            strategy_btc_holdings -= btc_sold
            strategy_cash += sell_proceeds

        buy_hold_amount = min(float(row["buy_hold_dca"]), buy_hold_cash)
        buy_hold_btc_bought = buy_hold_amount / close if buy_hold_amount > 0 else 0.0
        buy_hold_btc_holdings += buy_hold_btc_bought
        buy_hold_cash -= buy_hold_amount
        buy_hold_invested += buy_hold_amount

        df.at[index, "strategy_dca"] = buy_amount
        df.at[index, "strategy_btc_bought"] = btc_bought
        df.at[index, "strategy_btc_sold"] = btc_sold
        df.at[index, "strategy_sell_proceeds"] = sell_proceeds
        df.at[index, "strategy_btc_holdings"] = strategy_btc_holdings
        df.at[index, "strategy_cash"] = strategy_cash
        df.at[index, "strategy_portfolio"] = strategy_btc_holdings * close + strategy_cash
        df.at[index, "strategy_invested"] = strategy_invested

        df.at[index, "buy_hold_dca"] = buy_hold_amount
        df.at[index, "buy_hold_btc_bought"] = buy_hold_btc_bought
        df.at[index, "buy_hold_btc_holdings"] = buy_hold_btc_holdings
        df.at[index, "buy_hold_cash"] = buy_hold_cash
        df.at[index, "buy_hold_portfolio"] = buy_hold_btc_holdings * close + buy_hold_cash
        df.at[index, "buy_hold_invested"] = buy_hold_invested

    df["strategy_equity"] = df["strategy_portfolio"] / starting_cash
    df["buy_hold_equity"] = df["buy_hold_portfolio"] / starting_cash

    return df.dropna()


def print_summary(results: pd.DataFrame) -> None:
    overview = build_overview(results)

    print("\nLatest risk score:")
    print(round(float(overview["latest_risk"]), 2))

    print("\nOverview:")
    print(overview["overview_text"])

    print("\nCurrent weekly DCA signal:")
    print(
        "If this is the risk score used for Sunday close: "
        f"${float(overview['next_sunday_amount']):,.2f}"
    )
    print(
        "Current sell tier: "
        f"{float(overview['current_sell_fraction']):.0%} of BTC position on an upward tier crossing"
    )

    print("\nLast 10 rows:")
    columns = [
        "close",
        "valuation",
        "trend",
        "structure",
        "sentiment",
        "risk_score",
        "risk_used",
        "strategy_dca",
        "sell_fraction",
        "strategy_btc_sold",
        "strategy_cash",
        "buy_hold_dca",
        "strategy_portfolio",
        "buy_hold_portfolio",
    ]
    print(results[columns].tail(10).round(4).to_string())

    print("\nFinal portfolio comparison:")
    print(f"Strategy final value:  ${float(overview['strategy_final']):,.2f}")
    print(f"Buy & hold final value: ${float(overview['buy_hold_final']):,.2f}")
    print(f"Starting cash:         ${float(overview['starting_cash']):,.2f}")
    print(f"Display start:         {overview['display_start']}")
    print(f"Deployment start:      {overview['deployment_start']}")
    print(f"Strategy invested:     ${float(overview['strategy_invested']):,.2f}")
    print(f"Buy & hold invested:   ${float(overview['buy_hold_invested']):,.2f}")
    print(f"Strategy BTC holdings: {float(overview['strategy_btc_holdings']):,.8f}")
    print(f"Strategy cash:         ${float(overview['strategy_cash']):,.2f}")

    print("\nDiagnostics:")
    print(f"Correlation risk_score vs next-day return: {float(overview['risk_future_corr']):.4f}")
    print(f"Strategy max drawdown:                  {format_pct(float(overview['strategy_dd']))}")
    print(f"Buy & hold max drawdown:                {format_pct(float(overview['buy_hold_dd']))}")
