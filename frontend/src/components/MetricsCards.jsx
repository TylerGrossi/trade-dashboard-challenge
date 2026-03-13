export default function MetricsCards({ metrics }) {
  const cards = [
    {
      label: "Total P&L",
      value: `$${metrics.total_pnl.toFixed(2)}`,
      type: metrics.total_pnl >= 0 ? "profit" : "loss",
    },
    {
      label: "Return",
      value: `${metrics.total_pnl_pct.toFixed(2)}%`,
      type: metrics.total_pnl_pct >= 0 ? "profit" : "loss",
    },
    {
      label: "Annualized Return",
      value: `${metrics.annualized_return.toFixed(2)}%`,
      type: metrics.annualized_return >= 0 ? "profit" : "loss",
    },
    {
      label: "Sharpe Ratio",
      value: metrics.sharpe_ratio.toFixed(2),
      type: metrics.sharpe_ratio >= 1 ? "profit" : metrics.sharpe_ratio >= 0 ? "neutral" : "loss",
    },
    {
      label: "Max Drawdown",
      value: `$${metrics.max_drawdown.toFixed(2)}`,
      type: "loss",
    },
    {
      label: "Win Rate",
      value: `${metrics.win_probability.toFixed(1)}%`,
      type: "neutral",
    },
    {
      label: "Total Trades",
      value: metrics.total_trades,
      type: "neutral",
    },
  ];

  return (
    <div className="metrics-cards">
      {cards.map((c, i) => (
        <div className="metric-card" key={i}>
          <div className="label">{c.label}</div>
          <div className={`value ${c.type}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
