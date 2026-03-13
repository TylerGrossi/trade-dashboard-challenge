"""Backtesting engine – runs strategies and computes performance metrics."""

from datetime import datetime

import numpy as np

from strategies import rsi_mean_reversion, sma_crossover, price_threshold


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
def compute_metrics(
    trades: list[dict],
    closes: list[float],
    start_date: str,
    end_date: str,
) -> dict:
    if not trades:
        return {
            "total_pnl": 0,
            "total_pnl_pct": 0,
            "annualized_return": 0,
            "max_drawdown": 0,
            "max_drawdown_pct": 0,
            "win_probability": 0,
            "sharpe_ratio": 0,
            "total_trades": 0,
        }

    total_pnl = sum(t["pnl"] for t in trades)
    initial_price = closes[0]
    total_return = total_pnl / initial_price

    days = (
        datetime.strptime(end_date, "%Y-%m-%d")
        - datetime.strptime(start_date, "%Y-%m-%d")
    ).days
    years = days / 365.25

    if years > 0 and total_return > -1:
        annualized_return = (1 + total_return) ** (1 / years) - 1
    else:
        annualized_return = total_return

    # Max drawdown from cumulative P&L
    equity = [0.0]
    for t in trades:
        equity.append(equity[-1] + t["pnl"])
    peak = equity[0]
    max_dd = 0.0
    for val in equity:
        if val > peak:
            peak = val
        dd = val - peak
        if dd < max_dd:
            max_dd = dd

    max_dd_pct = (max_dd / initial_price * 100) if initial_price else 0

    wins = sum(1 for t in trades if t["pnl"] > 0)

    # Sharpe Ratio: annualized from per-trade returns
    trade_returns = np.array([t["pnl"] / t["entry_price"] for t in trades])
    if len(trade_returns) > 1 and np.std(trade_returns) > 0:
        avg_trades_per_year = len(trades) / years if years > 0 else len(trades)
        sharpe = (
            np.mean(trade_returns) / np.std(trade_returns)
        ) * np.sqrt(avg_trades_per_year)
    else:
        sharpe = 0.0

    return {
        "total_pnl": round(total_pnl, 2),
        "total_pnl_pct": round(total_return * 100, 2),
        "annualized_return": round(annualized_return * 100, 2),
        "max_drawdown": round(max_dd, 2),
        "max_drawdown_pct": round(max_dd_pct, 2),
        "win_probability": round(wins / len(trades) * 100, 2),
        "sharpe_ratio": round(float(sharpe), 2),
        "total_trades": len(trades),
    }


# ---------------------------------------------------------------------------
# Equity curve (includes unrealized P&L during open positions)
# ---------------------------------------------------------------------------
def compute_equity_curve(
    trades: list[dict],
    dates: list[str],
    closes: list[float],
) -> list[dict]:
    equity: list[dict] = []
    realized_pnl = 0.0
    trade_idx = 0
    in_position = False
    entry_price = 0.0

    for i, date in enumerate(dates):
        # Detect entry
        if (
            trade_idx < len(trades)
            and date == trades[trade_idx]["entry_date"]
            and not in_position
        ):
            in_position = True
            entry_price = trades[trade_idx]["entry_price"]

        unrealized = (closes[i] - entry_price) if in_position else 0.0
        current_equity = realized_pnl + unrealized

        # Detect exit
        if (
            trade_idx < len(trades)
            and date == trades[trade_idx]["exit_date"]
            and in_position
        ):
            realized_pnl += trades[trade_idx]["pnl"]
            current_equity = realized_pnl
            in_position = False
            trade_idx += 1

        equity.append({
            "date": date,
            "equity": round(current_equity, 2),
            "price": round(closes[i], 2),
        })

    return equity


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def run_backtest(
    strategy_name: str,
    dates: list[str],
    closes: list[float],
    params: dict,
) -> dict:
    if strategy_name == "rsi_mean_reversion":
        trades, rsi = rsi_mean_reversion(
            dates,
            closes,
            rsi_period=int(params.get("rsi_period", 7)),
            oversold=int(params.get("oversold", 30)),
            overbought=int(params.get("overbought", 70)),
        )
    elif strategy_name == "sma_crossover":
        trades, sma_short, sma_long = sma_crossover(
            dates,
            closes,
            short_window=int(params.get("short_window", 20)),
            long_window=int(params.get("long_window", 50)),
        )
    elif strategy_name == "price_threshold":
        trades = price_threshold(
            dates,
            closes,
            threshold=float(params.get("threshold", 150)),
            hold_days=int(params.get("hold_days", 10)),
        )
    else:
        raise ValueError(f"Unknown strategy: {strategy_name}")

    metrics = compute_metrics(trades, closes, dates[0], dates[-1])
    equity_curve = compute_equity_curve(trades, dates, closes)

    result = {
        "trades": trades,
        "metrics": metrics,
        "equity_curve": equity_curve,
        "price_data": [
            {"date": d, "close": round(c, 2)} for d, c in zip(dates, closes)
        ],
    }

    if strategy_name == "rsi_mean_reversion":
        result["rsi"] = [
            {"date": d, "value": round(r, 2) if not np.isnan(r) else None}
            for d, r in zip(dates, rsi)
        ]
    elif strategy_name == "sma_crossover":
        result["sma"] = [
            {
                "date": d,
                "short": round(s, 2) if not np.isnan(s) else None,
                "long": round(l, 2) if not np.isnan(l) else None,
            }
            for d, s, l in zip(dates, sma_short, sma_long)
        ]

    return result
