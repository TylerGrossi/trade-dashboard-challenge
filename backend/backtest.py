"""Backtesting engine – runs strategies and computes performance metrics."""

from datetime import datetime

import numpy as np

from strategies import (
    bollinger_bands as bollinger_bands_strategy,
    compute_bollinger_bands,
    compute_rsi,
    compute_sma,
    compute_zscore,
    price_threshold,
    rsi_mean_reversion,
    sma_crossover,
    zscore_mean_reversion,
)


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
    elif strategy_name == "bollinger_bands":
        trades, bb_mid, bb_upper, bb_lower = bollinger_bands_strategy(
            dates,
            closes,
            bb_period=int(params.get("bb_period", 20)),
            num_std=float(params.get("num_std", 2)),
        )
    elif strategy_name == "zscore_mean_reversion":
        trades, z_scores, z_means = zscore_mean_reversion(
            dates,
            closes,
            z_window=int(params.get("z_window", 20)),
            entry_z=float(params.get("entry_z", 2)),
            exit_z=float(params.get("exit_z", 0)),
        )
    else:
        raise ValueError(f"Unknown strategy: {strategy_name}")

    metrics = compute_metrics(trades, closes, dates[0], dates[-1])
    equity_curve = compute_equity_curve(trades, dates, closes)

    recommendation = compute_current_recommendation(
        strategy_name=strategy_name,
        dates=dates,
        closes=closes,
        params=params,
        metrics=metrics,
    )

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
    elif strategy_name == "bollinger_bands":
        result["bollinger"] = [
            {
                "date": d,
                "middle": round(m, 2) if not np.isnan(m) else None,
                "upper": round(u, 2) if not np.isnan(u) else None,
                "lower": round(lo, 2) if not np.isnan(lo) else None,
            }
            for d, m, u, lo in zip(dates, bb_mid, bb_upper, bb_lower)
        ]
    elif strategy_name == "zscore_mean_reversion":
        ez = float(params.get("entry_z", 2))
        xz = float(params.get("exit_z", 0))
        result["zscore"] = [
            {
                "date": d,
                "z": round(z, 3) if not np.isnan(z) else None,
                "mean": round(mn, 2) if not np.isnan(mn) else None,
            }
            for d, z, mn in zip(dates, z_scores, z_means)
        ]
        result["zscore_levels"] = {
            "entry_line": round(-abs(ez), 3),
            "exit_line": round(xz, 3),
        }

    result["recommendation"] = recommendation

    return result


def _confidence_from_metrics(metrics: dict) -> int:
    """
    Simple confidence proxy from historical metrics.

    NOTE: This is a UI heuristic, not a statistical guarantee.
    """
    sharpe = float(metrics.get("sharpe_ratio", 0) or 0)
    win_prob = float(metrics.get("win_probability", 0) or 0)

    if sharpe >= 1.0:
        base = 80
    elif sharpe >= 0.0:
        base = 55
    else:
        base = 25

    if win_prob >= 55:
        base += 5
    elif win_prob <= 45:
        base -= 5

    return max(0, min(100, int(round(base))))


def compute_current_recommendation(
    strategy_name: str,
    dates: list[str],
    closes: list[float],
    params: dict,
    metrics: dict,
) -> dict:
    """
    Compute what the strategy would suggest on the latest bar.

    - BUY/SELL triggers only if the strategy's entry/exit condition happens
      on the latest bar.
    - Otherwise return HOLD, with LONG vs FLAT context.
    """
    if not dates or not closes:
        return {
            "action": "HOLD",
            "position": "FLAT",
            "current_date": None,
            "current_price": None,
            "confidence": 0,
            "reason": "No market data available to compute a recommendation.",
        }

    last_idx = len(dates) - 1
    current_date = dates[last_idx]
    current_price = round(float(closes[last_idx]), 2)

    confidence = _confidence_from_metrics(metrics or {})

    # -----------------------------------------------------------------------
    # RSI Mean Reversion
    # -----------------------------------------------------------------------
    if strategy_name == "rsi_mean_reversion":
        rsi_period = int(params.get("rsi_period", 7))
        oversold = int(params.get("oversold", 30))
        overbought = int(params.get("overbought", 70))

        rsi = compute_rsi(closes, rsi_period)
        rsi_last = rsi[last_idx]

        position_open = False
        entry_signal_today = False
        exit_signal_today = False

        for i in range(len(dates)):
            if np.isnan(rsi[i]):
                continue

            if not position_open and rsi[i] < oversold:
                position_open = True
                if i == last_idx:
                    entry_signal_today = True
            elif position_open and rsi[i] > overbought:
                position_open = False
                if i == last_idx:
                    exit_signal_today = True

        if exit_signal_today:
            return {
                "action": "SELL",
                "position": "LONG",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": f"RSI {rsi_last:.1f} entered overbought (> {overbought}) on the latest bar.",
            }
        if entry_signal_today:
            return {
                "action": "BUY",
                "position": "FLAT",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": f"RSI {rsi_last:.1f} dropped below oversold (< {oversold}) on the latest bar.",
            }

        position_label = "LONG" if position_open else "FLAT"
        if np.isnan(rsi_last):
            reason = "RSI is not defined on the latest bar yet (insufficient lookback)."
        elif position_open:
            reason = f"RSI {rsi_last:.1f} is not overbought (> {overbought}); holding the long position."
        else:
            reason = (
                f"RSI {rsi_last:.1f} is between oversold (< {oversold}) and overbought (> {overbought}); waiting for entry."
            )

        return {
            "action": "HOLD",
            "position": position_label,
            "current_date": current_date,
            "current_price": current_price,
            "confidence": confidence,
            "reason": reason,
        }

    # -----------------------------------------------------------------------
    # SMA Crossover
    # -----------------------------------------------------------------------
    if strategy_name == "sma_crossover":
        short_window = int(params.get("short_window", 20))
        long_window = int(params.get("long_window", 50))

        sma_short = compute_sma(closes, short_window)
        sma_long = compute_sma(closes, long_window)

        position_open = False
        entry_signal_today = False
        exit_signal_today = False

        for i in range(1, len(dates)):
            short_prev, short_cur = sma_short[i - 1], sma_short[i]
            long_prev, long_cur = sma_long[i - 1], sma_long[i]

            if np.isnan(short_prev) or np.isnan(long_prev):
                continue

            if not position_open and short_prev <= long_prev and short_cur > long_cur:
                position_open = True
                if i == last_idx:
                    entry_signal_today = True
            elif position_open and short_prev >= long_prev and short_cur < long_cur:
                position_open = False
                if i == last_idx:
                    exit_signal_today = True

        short_last = sma_short[last_idx]
        long_last = sma_long[last_idx]
        short_prev_last = sma_short[last_idx - 1] if last_idx - 1 >= 0 else float("nan")
        long_prev_last = sma_long[last_idx - 1] if last_idx - 1 >= 0 else float("nan")

        if exit_signal_today:
            return {
                "action": "SELL",
                "position": "LONG",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": (
                    f"Death-cross on the latest bar (short SMA {short_last:.2f} < long SMA {long_last:.2f})."
                ),
            }
        if entry_signal_today:
            return {
                "action": "BUY",
                "position": "FLAT",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": (
                    f"Golden-cross on the latest bar (short SMA {short_last:.2f} > long SMA {long_last:.2f})."
                ),
            }

        position_label = "LONG" if position_open else "FLAT"
        if np.isnan(short_last) or np.isnan(long_last):
            reason = "SMA values are not defined on the latest bar yet (insufficient lookback)."
        elif position_open:
            reason = (
                f"Short SMA ({short_last:.2f}) remains above Long SMA ({long_last:.2f}); holding long (no death-cross today)."
            )
        else:
            reason = (
                f"Waiting for next golden-cross: short SMA ({short_last:.2f}) vs long SMA ({long_last:.2f}). "
                f"(Prev bar: short {short_prev_last:.2f}, long {long_prev_last:.2f})"
            )

        return {
            "action": "HOLD",
            "position": position_label,
            "current_date": current_date,
            "current_price": current_price,
            "confidence": confidence,
            "reason": reason,
        }

    # -----------------------------------------------------------------------
    # Bollinger Bands mean reversion
    # -----------------------------------------------------------------------
    if strategy_name == "bollinger_bands":
        bb_period = int(params.get("bb_period", 20))
        num_std = float(params.get("num_std", 2))
        _, upper, lower = compute_bollinger_bands(closes, bb_period, num_std)

        position_open = False
        entry_signal_today = False
        exit_signal_today = False

        for i in range(len(dates)):
            if np.isnan(lower[i]) or np.isnan(upper[i]):
                continue

            if not position_open and closes[i] <= lower[i]:
                position_open = True
                if i == last_idx:
                    entry_signal_today = True
            elif position_open and closes[i] >= upper[i]:
                position_open = False
                if i == last_idx:
                    exit_signal_today = True

        low_last = lower[last_idx]
        up_last = upper[last_idx]

        if exit_signal_today:
            return {
                "action": "SELL",
                "position": "LONG",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": (
                    f"Close ${current_price} is at or above the upper Bollinger Band ({up_last:.2f}); mean-reversion exit."
                ),
            }
        if entry_signal_today:
            return {
                "action": "BUY",
                "position": "FLAT",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": (
                    f"Close ${current_price} is at or below the lower Bollinger Band ({low_last:.2f}); mean-reversion entry."
                ),
            }

        position_label = "LONG" if position_open else "FLAT"
        if np.isnan(low_last) or np.isnan(up_last):
            reason = (
                "Bollinger Bands are not defined on the latest bar yet (insufficient lookback)."
            )
        elif position_open:
            reason = (
                f"Holding long: close ${current_price} has not reached the upper band ({up_last:.2f}) yet."
            )
        else:
            reason = (
                f"Flat: close ${current_price} is between bands (lower {low_last:.2f}, upper {up_last:.2f})."
            )

        return {
            "action": "HOLD",
            "position": position_label,
            "current_date": current_date,
            "current_price": current_price,
            "confidence": confidence,
            "reason": reason,
        }

    # -----------------------------------------------------------------------
    # Z-score mean reversion
    # -----------------------------------------------------------------------
    if strategy_name == "zscore_mean_reversion":
        z_window = int(params.get("z_window", 20))
        entry_z = float(params.get("entry_z", 2))
        exit_z = float(params.get("exit_z", 0))
        entry_level = -abs(entry_z)

        z_scores, _ = compute_zscore(closes, z_window)

        position_open = False
        entry_signal_today = False
        exit_signal_today = False

        for i in range(len(dates)):
            if np.isnan(z_scores[i]):
                continue

            if not position_open and z_scores[i] <= entry_level:
                position_open = True
                if i == last_idx:
                    entry_signal_today = True
            elif position_open and z_scores[i] >= exit_z:
                position_open = False
                if i == last_idx:
                    exit_signal_today = True

        z_last = z_scores[last_idx]

        if exit_signal_today:
            return {
                "action": "SELL",
                "position": "LONG",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": (
                    f"Z-score {z_last:.2f} reached the exit level (≥ {exit_z:g}) on the latest bar."
                ),
            }
        if entry_signal_today:
            return {
                "action": "BUY",
                "position": "FLAT",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": (
                    f"Z-score {z_last:.2f} is at or below entry (≤ {entry_level:g}) on the latest bar."
                ),
            }

        position_label = "LONG" if position_open else "FLAT"
        if np.isnan(z_last):
            reason = "Z-score is not defined on the latest bar yet (insufficient lookback)."
        elif position_open:
            reason = (
                f"Holding long: Z-score {z_last:.2f} has not reached exit (≥ {exit_z:g}) yet."
            )
        else:
            reason = (
                f"Flat: Z-score {z_last:.2f}; waiting for entry (≤ {entry_level:g})."
            )

        return {
            "action": "HOLD",
            "position": position_label,
            "current_date": current_date,
            "current_price": current_price,
            "confidence": confidence,
            "reason": reason,
        }

    # -----------------------------------------------------------------------
    # Price Threshold
    # -----------------------------------------------------------------------
    if strategy_name == "price_threshold":
        threshold = float(params.get("threshold", 150))
        hold_days = int(params.get("hold_days", 10))

        position_open = False
        position_entry_date = None
        position_entry_price = None
        bars_held = 0

        entry_signal_today = False
        exit_signal_today = False

        for i in range(1, len(dates)):
            if position_open:
                bars_held += 1
                if bars_held >= hold_days:
                    if i == last_idx:
                        exit_signal_today = True
                    position_open = False
                    position_entry_date = None
                    position_entry_price = None
                    bars_held = 0
                    continue

            if (not position_open) and closes[i - 1] < threshold <= closes[i]:
                position_open = True
                position_entry_date = dates[i]
                position_entry_price = closes[i]
                bars_held = 0
                if i == last_idx:
                    entry_signal_today = True

        if exit_signal_today:
            return {
                "action": "SELL",
                "position": "LONG",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": f"Price-threshold holding period reached ({hold_days} days); exiting on the latest bar.",
            }
        if entry_signal_today:
            return {
                "action": "BUY",
                "position": "FLAT",
                "current_date": current_date,
                "current_price": current_price,
                "confidence": confidence,
                "reason": f"Price crossed above ${threshold:g} on the latest bar.",
            }

        position_label = "LONG" if position_open else "FLAT"
        if position_open:
            reason = (
                f"Currently holding long since {position_entry_date}. "
                f"Held {bars_held}/{hold_days} days; exit not triggered yet."
            )
        else:
            reason = (
                f"Waiting for price to cross above ${threshold:g}. Latest close is ${current_price}."
            )

        return {
            "action": "HOLD",
            "position": position_label,
            "current_date": current_date,
            "current_price": current_price,
            "confidence": confidence,
            "reason": reason,
        }

    return {
        "action": "HOLD",
        "position": "FLAT",
        "current_date": current_date,
        "current_price": current_price,
        "confidence": confidence,
        "reason": f"Recommendation not available for unknown strategy: {strategy_name}",
    }
