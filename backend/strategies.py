"""Trading strategy implementations."""

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Registry – the frontend reads this to build dynamic parameter forms
# ---------------------------------------------------------------------------
STRATEGIES = {
    "rsi_mean_reversion": {
        "name": "RSI Mean Reversion",
        "description": (
            "Buy when RSI drops below the oversold threshold, "
            "sell when RSI rises above the overbought threshold."
        ),
        "parameters": [
            {
                "name": "rsi_period",
                "label": "RSI Period",
                "type": "int",
                "default": 7,
                "min": 2,
                "max": 50,
            },
            {
                "name": "oversold",
                "label": "Oversold Threshold",
                "type": "int",
                "default": 30,
                "min": 1,
                "max": 49,
            },
            {
                "name": "overbought",
                "label": "Overbought Threshold",
                "type": "int",
                "default": 70,
                "min": 51,
                "max": 99,
            },
        ],
    },
    "sma_crossover": {
        "name": "SMA Crossover",
        "description": (
            "Buy when the short-period SMA crosses above the long-period SMA "
            "(golden cross), sell on the reverse (death cross)."
        ),
        "parameters": [
            {
                "name": "short_window",
                "label": "Short SMA Window",
                "type": "int",
                "default": 20,
                "min": 2,
                "max": 100,
            },
            {
                "name": "long_window",
                "label": "Long SMA Window",
                "type": "int",
                "default": 50,
                "min": 5,
                "max": 300,
            },
        ],
    },
    "price_threshold": {
        "name": "Price Threshold",
        "description": (
            "Buy when the price crosses from below to above a fixed threshold, "
            "then close the trade after a set number of trading days."
        ),
        "parameters": [
            {
                "name": "threshold",
                "label": "Price Threshold ($)",
                "type": "float",
                "default": 150,
                "min": 1,
                "max": 10000,
            },
            {
                "name": "hold_days",
                "label": "Holding Period (days)",
                "type": "int",
                "default": 10,
                "min": 1,
                "max": 252,
            },
        ],
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def compute_sma(closes: list[float], window: int) -> list[float]:
    """Simple moving average."""
    return pd.Series(closes).rolling(window=window).mean().tolist()


def compute_rsi(closes: list[float], period: int = 14) -> list[float]:
    """Compute RSI using Wilder's exponential smoothing."""
    prices = pd.Series(closes)
    deltas = prices.diff()

    gains = deltas.clip(lower=0)
    losses = (-deltas).clip(lower=0)

    avg_gain = gains.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = losses.ewm(alpha=1 / period, min_periods=period).mean()

    rs = avg_gain / avg_loss
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.tolist()


# ---------------------------------------------------------------------------
# Strategies – each returns (trades, indicator_data)
# ---------------------------------------------------------------------------
def rsi_mean_reversion(
    dates: list[str],
    closes: list[float],
    rsi_period: int = 14,
    oversold: int = 30,
    overbought: int = 70,
) -> tuple[list[dict], list[float]]:
    """RSI Mean Reversion: buy oversold, sell overbought."""
    rsi = compute_rsi(closes, rsi_period)
    trades: list[dict] = []
    position: dict | None = None

    for i in range(len(dates)):
        if np.isnan(rsi[i]):
            continue

        if position is None and rsi[i] < oversold:
            position = {"entry_date": dates[i], "entry_price": closes[i]}

        elif position is not None and rsi[i] > overbought:
            pnl = closes[i] - position["entry_price"]
            trades.append({
                "entry_date": position["entry_date"],
                "entry_price": round(position["entry_price"], 2),
                "exit_date": dates[i],
                "exit_price": round(closes[i], 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl / position["entry_price"] * 100, 2),
            })
            position = None

    # Close any open position at the end of the window
    if position is not None:
        pnl = closes[-1] - position["entry_price"]
        trades.append({
            "entry_date": position["entry_date"],
            "entry_price": round(position["entry_price"], 2),
            "exit_date": dates[-1],
            "exit_price": round(closes[-1], 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl / position["entry_price"] * 100, 2),
        })

    return trades, rsi


def sma_crossover(
    dates: list[str],
    closes: list[float],
    short_window: int = 20,
    long_window: int = 50,
) -> tuple[list[dict], list[float], list[float]]:
    """SMA Crossover: buy on golden cross, sell on death cross."""
    sma_short = compute_sma(closes, short_window)
    sma_long = compute_sma(closes, long_window)
    trades: list[dict] = []
    position: dict | None = None

    for i in range(1, len(dates)):
        short_prev, short_cur = sma_short[i - 1], sma_short[i]
        long_prev, long_cur = sma_long[i - 1], sma_long[i]

        if np.isnan(short_prev) or np.isnan(long_prev):
            continue

        # Golden cross: short crosses above long
        if position is None and short_prev <= long_prev and short_cur > long_cur:
            position = {"entry_date": dates[i], "entry_price": closes[i]}

        # Death cross: short crosses below long
        elif position is not None and short_prev >= long_prev and short_cur < long_cur:
            pnl = closes[i] - position["entry_price"]
            trades.append({
                "entry_date": position["entry_date"],
                "entry_price": round(position["entry_price"], 2),
                "exit_date": dates[i],
                "exit_price": round(closes[i], 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl / position["entry_price"] * 100, 2),
            })
            position = None

    if position is not None:
        pnl = closes[-1] - position["entry_price"]
        trades.append({
            "entry_date": position["entry_date"],
            "entry_price": round(position["entry_price"], 2),
            "exit_date": dates[-1],
            "exit_price": round(closes[-1], 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl / position["entry_price"] * 100, 2),
        })

    return trades, sma_short, sma_long


def price_threshold(
    dates: list[str],
    closes: list[float],
    threshold: float = 150,
    hold_days: int = 10,
) -> list[dict]:
    """Price Threshold: buy when price crosses above threshold, hold for N days."""
    trades: list[dict] = []
    position: dict | None = None
    bars_held = 0

    for i in range(1, len(dates)):
        # Count holding days for open position
        if position is not None:
            bars_held += 1
            if bars_held >= hold_days:
                pnl = closes[i] - position["entry_price"]
                trades.append({
                    "entry_date": position["entry_date"],
                    "entry_price": round(position["entry_price"], 2),
                    "exit_date": dates[i],
                    "exit_price": round(closes[i], 2),
                    "pnl": round(pnl, 2),
                    "pnl_pct": round(pnl / position["entry_price"] * 100, 2),
                })
                position = None
                bars_held = 0
                continue

        # Entry: price crosses from below to above the threshold
        if position is None and closes[i - 1] < threshold <= closes[i]:
            position = {"entry_date": dates[i], "entry_price": closes[i]}
            bars_held = 0

    # Close open position at end
    if position is not None:
        pnl = closes[-1] - position["entry_price"]
        trades.append({
            "entry_date": position["entry_date"],
            "entry_price": round(position["entry_price"], 2),
            "exit_date": dates[-1],
            "exit_price": round(closes[-1], 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl / position["entry_price"] * 100, 2),
        })

    return trades
