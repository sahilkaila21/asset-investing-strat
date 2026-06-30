from __future__ import annotations

import argparse
import os
import urllib.parse
import urllib.request

import matplotlib

matplotlib.use("TkAgg")

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from backtest import build_overview, print_summary, run_backtest
from data import load_btc_data
from factors import add_factors, add_risk_and_allocation

CHART_FREQUENCY = "W-SUN"


def format_money(value: float) -> str:
    return f"${value:,.0f}"


def build_alert_message(results: pd.DataFrame) -> str:
    overview = build_overview(results)
    return "\n".join(
        [
            "Bitcoin Risk Model Weekly Alert",
            "",
            str(overview["overview_text"]),
            "",
            "Current Signal",
            f"Risk score: {float(overview['latest_risk']):.2f} / 10",
            f"Sunday close buy: {format_money(float(overview['next_sunday_amount']))}",
            f"Sell tier: {float(overview['current_sell_fraction']):.0%}",
            "",
            "Portfolio Status",
            f"Strategy value: {format_money(float(overview['strategy_final']))}",
            f"Cash: {format_money(float(overview['strategy_cash']))}",
            f"BTC holdings: {float(overview['strategy_btc_holdings']):.8f}",
            f"Invested: {format_money(float(overview['strategy_invested']))}",
            f"Starting cash: {format_money(float(overview['starting_cash']))}",
            "",
            "Risk Metrics",
            f"Strategy max drawdown: {float(overview['strategy_dd']) * 100:.2f}%",
            f"Risk / next-day return correlation: {float(overview['risk_future_corr']):.4f}",
            "",
            f"Display start: {overview['display_start']}",
            f"Deployment start: {overview['deployment_start']}",
        ]
    )


def send_telegram_alert(message: str) -> None:
    bot_token = os.environ.get("BTC_ALERT_TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("BTC_ALERT_TELEGRAM_CHAT_ID")
    if not bot_token or not chat_id:
        raise RuntimeError(
            "Missing Telegram alert settings. Set BTC_ALERT_TELEGRAM_BOT_TOKEN "
            "and BTC_ALERT_TELEGRAM_CHAT_ID."
        )

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = urllib.parse.urlencode({"chat_id": chat_id, "text": message}).encode("utf-8")
    request = urllib.request.Request(url, data=payload, method="POST")
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status >= 400:
            raise RuntimeError(f"Telegram alert failed with HTTP {response.status}.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bitcoin risk model dashboard and alerts.")
    parser.add_argument(
        "--send-telegram-alert",
        action="store_true",
        help="Send the latest overview and portfolio status to Telegram.",
    )
    parser.add_argument(
        "--no-chart",
        action="store_true",
        help="Run the model without opening the matplotlib chart window.",
    )
    return parser.parse_args()


def format_hover_value(value: float, kind: str) -> str:
    if kind == "money":
        return f"${value:,.2f}"
    if kind == "btc":
        return f"{value:.8f} BTC"
    if kind == "risk":
        return f"{value:.2f}"
    if kind == "percent":
        return f"{value:.0%}"
    return f"{value:,.4f}"


def nearest_position(date_numbers: np.ndarray, x_value: float) -> int:
    insert_at = int(np.searchsorted(date_numbers, x_value))
    if insert_at <= 0:
        return 0
    if insert_at >= len(date_numbers):
        return len(date_numbers) - 1
    before = insert_at - 1
    after = insert_at
    if abs(date_numbers[after] - x_value) < abs(x_value - date_numbers[before]):
        return after
    return before


def nearest_row(
    results: pd.DataFrame,
    date_numbers: np.ndarray,
    x_value: float,
) -> tuple[int, pd.Timestamp, pd.Series]:
    nearest_position_value = nearest_position(date_numbers, x_value)
    nearest_date = results.index[nearest_position_value]
    return nearest_position_value, nearest_date, results.iloc[nearest_position_value]


def add_hover_crosshair(fig, results: pd.DataFrame, chart_configs: list[dict]) -> None:
    hover_state = {}
    date_numbers = mdates.date2num(results.index.to_pydatetime())
    last_hover_key = {"ax": None, "position": None}

    for config in chart_configs:
        ax = config["ax"]
        hover_state[ax] = {
            "vline": ax.axvline(color="#222222", linewidth=0.9, alpha=0.55, visible=False),
            "hline": ax.axhline(color="#222222", linewidth=0.9, alpha=0.55, visible=False),
            "annotation": ax.annotate(
                "",
                xy=(0, 0),
                xytext=(14, 14),
                textcoords="offset points",
                fontsize=9,
                bbox={
                    "boxstyle": "round,pad=0.35",
                    "facecolor": "white",
                    "edgecolor": "#777777",
                    "alpha": 0.94,
                },
                arrowprops={"arrowstyle": "->", "color": "#777777", "linewidth": 0.8},
                visible=False,
            ),
        }

    def hide_all() -> None:
        if last_hover_key["ax"] is None and last_hover_key["position"] is None:
            return
        for state in hover_state.values():
            state["vline"].set_visible(False)
            state["hline"].set_visible(False)
            state["annotation"].set_visible(False)
        last_hover_key["ax"] = None
        last_hover_key["position"] = None

    def on_motion(event) -> None:
        active_config = next(
            (
                config
                for config in chart_configs
                if event.inaxes == config["ax"] and event.xdata is not None
            ),
            None,
        )

        if active_config is None:
            hide_all()
            fig.canvas.draw_idle()
            return

        ax = active_config["ax"]
        state = hover_state[ax]
        row_position, nearest_date, row = nearest_row(results, date_numbers, event.xdata)
        if last_hover_key["ax"] == ax and last_hover_key["position"] == row_position:
            return
        last_hover_key["ax"] = ax
        last_hover_key["position"] = row_position

        primary_column = active_config["primary"]
        primary_value = float(row[primary_column])

        for other_ax, other_state in hover_state.items():
            is_active = other_ax == ax
            other_state["vline"].set_visible(is_active)
            other_state["hline"].set_visible(is_active)
            other_state["annotation"].set_visible(is_active)

        state["vline"].set_xdata([nearest_date, nearest_date])
        state["hline"].set_ydata([primary_value, primary_value])

        lines = [nearest_date.strftime("%Y-%m-%d")]
        for label, column, kind in active_config["rows"]:
            lines.append(f"{label}: {format_hover_value(float(row[column]), kind)}")

        state["annotation"].xy = (nearest_date, primary_value)
        state["annotation"].set_text("\n".join(lines))
        fig.canvas.draw_idle()

    def on_leave(_event) -> None:
        hide_all()
        fig.canvas.draw_idle()

    fig.canvas.mpl_connect("motion_notify_event", on_motion)
    fig.canvas.mpl_connect("figure_leave_event", on_leave)


def prepare_chart_data(results: pd.DataFrame, frequency: str = CHART_FREQUENCY) -> pd.DataFrame:
    resampled = results.resample(frequency)
    chart_data = resampled.agg(
        {
            "close": "last",
            "buy_hold_portfolio": "last",
            "strategy_portfolio": "last",
            "risk_score": "last",
            "risk_used": "last",
            "strategy_dca": "sum",
            "strategy_btc_sold": "sum",
            "strategy_sell_proceeds": "sum",
            "strategy_cash": "last",
            "strategy_btc_holdings": "last",
            "sell_fraction": "max",
        }
    )
    last_actual_dates = resampled["close"].apply(
        lambda series: series.index[-1] if len(series) else pd.NaT
    )
    chart_data.index = pd.DatetimeIndex(last_actual_dates)
    return chart_data.dropna(subset=["close", "risk_score"])


def plot_results(results):
    overview = build_overview(results)
    chart_results = prepare_chart_data(results)

    plt.style.use("seaborn-v0_8-whitegrid")
    fig = plt.figure(figsize=(15, 10), constrained_layout=True)
    grid = fig.add_gridspec(3, 4, width_ratios=[1, 1, 1, 0.95])

    ax_equity = fig.add_subplot(grid[0, :3])
    ax_risk = fig.add_subplot(grid[1, :3], sharex=ax_equity)
    ax_flow = fig.add_subplot(grid[2, :3], sharex=ax_equity)
    ax_metrics = fig.add_subplot(grid[:, 3])
    deployment_start = pd.Timestamp(str(overview["deployment_start"]))

    fig.suptitle("Bitcoin Risk Model MVP+", fontsize=18, fontweight="bold")

    ax_equity.plot(chart_results.index, chart_results["buy_hold_portfolio"], label="Buy & hold DCA")
    ax_equity.plot(
        chart_results.index,
        chart_results["strategy_portfolio"],
        label="Risk-managed DCA",
        linewidth=2.2,
    )
    ax_equity.set_title("Portfolio Performance (Weekly View)")
    ax_equity.set_ylabel("Portfolio value ($)")
    ax_equity.set_ylim(0, 200_000)
    ax_equity.axvline(deployment_start, color="#111111", linestyle=":", linewidth=1.4)
    ax_equity.text(
        deployment_start,
        ax_equity.get_ylim()[1],
        " Deployment starts",
        fontsize=9,
        va="top",
    )
    ax_equity.legend(loc="upper left")
    ax_equity.grid(True, alpha=0.25)

    ax_risk.axhspan(0, 3, color="#2ca02c", alpha=0.12, label="Buy zone")
    ax_risk.axhspan(3, 6, color="#7f7f7f", alpha=0.08, label="No-action zone")
    ax_risk.axhspan(6, 10, color="#d62728", alpha=0.10, label="Sell zone")
    ax_risk.plot(chart_results.index, chart_results["risk_score"], color="#d62728", linewidth=1.8)
    ax_risk.axhline(3, color="#2ca02c", linestyle="--", linewidth=1)
    ax_risk.axhline(6, color="#d62728", linestyle="--", linewidth=1)
    ax_risk.scatter(
        chart_results.index[chart_results["strategy_dca"] > 0],
        chart_results.loc[chart_results["strategy_dca"] > 0, "risk_score"],
        s=18,
        color="#2ca02c",
        label="Buy",
        zorder=3,
    )
    ax_risk.scatter(
        chart_results.index[chart_results["strategy_btc_sold"] > 0],
        chart_results.loc[chart_results["strategy_btc_sold"] > 0, "risk_score"],
        s=24,
        color="#d62728",
        marker="v",
        label="Sell",
        zorder=3,
    )
    ax_risk.set_title("Risk Score Over Time (Weekly View)")
    ax_risk.set_ylabel("Risk")
    ax_risk.set_ylim(0, 10)
    ax_risk.axvline(deployment_start, color="#111111", linestyle=":", linewidth=1.4)
    ax_risk.legend(loc="upper left", ncols=5, fontsize=9)
    ax_risk.grid(True, alpha=0.25)

    ax_flow.bar(
        chart_results.index,
        chart_results["strategy_dca"],
        width=3,
        color="#2ca02c",
        alpha=0.55,
        label="Sunday buy amount",
    )
    ax_flow.plot(
        chart_results.index,
        chart_results["strategy_cash"],
        color="#1f77b4",
        linewidth=1.8,
        label="Cash position",
    )
    ax_flow.set_title("Capital Flow (Weekly View)")
    ax_flow.set_ylabel("Dollars")
    ax_flow.axvline(deployment_start, color="#111111", linestyle=":", linewidth=1.4)
    ax_flow.legend(loc="upper left")
    ax_flow.grid(True, alpha=0.25)

    ax_metrics.axis("off")
    metrics_lines = [
        "Overview",
        str(overview["overview_text"]),
        f"Chart view: weekly",
        "",
        "Current Signal",
        f"Risk score: {float(overview['latest_risk']):.2f} / 10",
        f"Sunday buy: {format_money(float(overview['next_sunday_amount']))}",
        f"Sell tier: {float(overview['current_sell_fraction']):.0%}",
        "",
        "Portfolio",
        f"Display start: {overview['display_start']}",
        f"Deploy start: {overview['deployment_start']}",
        f"Starting cash: {format_money(float(overview['starting_cash']))}",
        f"Strategy: {format_money(float(overview['strategy_final']))}",
        f"Buy & hold: {format_money(float(overview['buy_hold_final']))}",
        f"Strategy invested: {format_money(float(overview['strategy_invested']))}",
        f"Cash: {format_money(float(overview['strategy_cash']))}",
        f"BTC: {float(overview['strategy_btc_holdings']):.6f}",
        "",
        "Risk Metrics",
        f"Strategy max DD: {float(overview['strategy_dd']) * 100:.2f}%",
        f"Buy & hold max DD: {float(overview['buy_hold_dd']) * 100:.2f}%",
        f"Risk/next-day corr: {float(overview['risk_future_corr']):.4f}",
    ]
    y = 0.98
    for line in metrics_lines:
        is_heading = line in {"Overview", "Current Signal", "Portfolio", "Risk Metrics"}
        ax_metrics.text(
            0.02,
            y,
            line,
            transform=ax_metrics.transAxes,
            fontsize=11 if is_heading else 9.5,
            fontweight="bold" if is_heading else "normal",
            va="top",
            wrap=True,
        )
        y -= 0.055 if line else 0.035

    add_hover_crosshair(
        fig,
        chart_results,
        [
            {
                "ax": ax_equity,
                "primary": "strategy_portfolio",
                "rows": [
                    ("Strategy", "strategy_portfolio", "money"),
                    ("Buy & hold", "buy_hold_portfolio", "money"),
                    ("BTC", "strategy_btc_holdings", "btc"),
                    ("Cash", "strategy_cash", "money"),
                ],
            },
            {
                "ax": ax_risk,
                "primary": "risk_score",
                "rows": [
                    ("BTC close", "close", "money"),
                    ("Risk", "risk_score", "risk"),
                    ("Risk used", "risk_used", "risk"),
                    ("Sunday buy", "strategy_dca", "money"),
                    ("Sell tier", "sell_fraction", "percent"),
                ],
            },
            {
                "ax": ax_flow,
                "primary": "strategy_cash",
                "rows": [
                    ("Cash", "strategy_cash", "money"),
                    ("Sunday buy", "strategy_dca", "money"),
                    ("Sell proceeds", "strategy_sell_proceeds", "money"),
                ],
            },
        ],
    )
    ax_flow.set_xlim(chart_results.index.min(), chart_results.index.max())

    plt.show()


def main() -> None:
    args = parse_args()
    raw = load_btc_data()
    factors = add_factors(raw)
    signals = add_risk_and_allocation(factors)
    results = run_backtest(signals)

    print_summary(results)
    if args.send_telegram_alert:
        send_telegram_alert(build_alert_message(results))
        print("\nTelegram alert sent.")
    if not args.no_chart:
        plot_results(results)


if __name__ == "__main__":
    main()
