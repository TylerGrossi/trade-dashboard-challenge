/**
 * Mirrors backend/strategies.py STRATEGIES — used when /api/strategies is unavailable
 * (e.g. dev server without proxy) so the Strategy dropdown still lists every option.
 */
export const STRATEGY_DEFAULTS = {
  rsi_mean_reversion: {
    name: "RSI Mean Reversion",
    description:
      "Buy when RSI drops below the oversold threshold, sell when RSI rises above the overbought threshold.",
    parameters: [
      { name: "rsi_period", label: "RSI Period", type: "int", default: 7, min: 2, max: 50 },
      { name: "oversold", label: "Oversold Threshold", type: "int", default: 30, min: 1, max: 49 },
      { name: "overbought", label: "Overbought Threshold", type: "int", default: 70, min: 51, max: 99 },
    ],
  },
  sma_crossover: {
    name: "SMA Crossover",
    description:
      "Buy when the short-period SMA crosses above the long-period SMA (golden cross), sell on the reverse (death cross).",
    parameters: [
      { name: "short_window", label: "Short SMA Window", type: "int", default: 20, min: 2, max: 100 },
      { name: "long_window", label: "Long SMA Window", type: "int", default: 50, min: 5, max: 300 },
    ],
  },
  price_threshold: {
    name: "Price Threshold",
    description:
      "Buy when the price crosses from below to above a fixed threshold, then close the trade after a set number of trading days.",
    parameters: [
      { name: "threshold", label: "Price Threshold ($)", type: "float", default: 9, min: 1, max: 10000 },
      { name: "hold_days", label: "Holding Period (days)", type: "int", default: 10, min: 1, max: 252 },
    ],
  },
  bollinger_bands: {
    name: "Bollinger Bands Mean Reversion",
    description:
      "Buy when the close is at or below the lower Bollinger Band (stretched below the mean), sell when the close is at or above the upper band.",
    parameters: [
      { name: "bb_period", label: "BB Period (SMA / std window)", type: "int", default: 20, min: 2, max: 200 },
      { name: "num_std", label: "Std. deviations", type: "float", default: 2, min: 0.5, max: 4 },
    ],
  },
  zscore_mean_reversion: {
    name: "Mean Reversion (Z-Score)",
    description:
      "Buy when the close is cheap vs its rolling mean (Z-score at or below -entry), sell when it reverts (Z-score at or above the exit level, often 0 = back to the mean).",
    parameters: [
      { name: "z_window", label: "Lookback (days)", type: "int", default: 20, min: 5, max: 200 },
      { name: "entry_z", label: "Entry σ (buy when Z ≤ −this)", type: "float", default: 2, min: 0.5, max: 4 },
      { name: "exit_z", label: "Exit Z (sell when Z ≥ this)", type: "float", default: 0, min: -2, max: 3 },
    ],
  },
};
