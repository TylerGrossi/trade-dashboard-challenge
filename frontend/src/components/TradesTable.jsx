function exportCSV(trades) {
  const header = "Trade #,Entry Date,Entry Price,Exit Date,Exit Price,P&L,P&L %";
  const rows = trades.map(
    (t, i) =>
      `${i + 1},${t.entry_date},${t.entry_price.toFixed(2)},${t.exit_date},${t.exit_price.toFixed(2)},${t.pnl.toFixed(2)},${t.pnl_pct.toFixed(2)}`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backtest_trades.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function TradesTable({ trades }) {
  if (!trades.length) {
    return (
      <div className="trades-section">
        <h3>Trades</h3>
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
          No trades were executed in this backtest.
        </p>
      </div>
    );
  }

  return (
    <div className="trades-section">
      <div className="trades-header">
        <h3>Trades ({trades.length})</h3>
        <button className="export-btn" onClick={() => exportCSV(trades)}>
          Export CSV
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="trades-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Entry Date</th>
              <th>Entry Price</th>
              <th>Exit Date</th>
              <th>Exit Price</th>
              <th>P&amp;L</th>
              <th>P&amp;L %</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{t.entry_date}</td>
                <td>${t.entry_price.toFixed(2)}</td>
                <td>{t.exit_date}</td>
                <td>${t.exit_price.toFixed(2)}</td>
                <td className={t.pnl >= 0 ? "profit-text" : "loss-text"}>
                  {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                </td>
                <td className={t.pnl_pct >= 0 ? "profit-text" : "loss-text"}>
                  {t.pnl_pct >= 0 ? "+" : ""}{t.pnl_pct.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
