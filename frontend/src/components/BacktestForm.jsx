import { useState, useEffect } from "react";

export default function BacktestForm({ strategies, onSubmit, loading }) {
  const [symbol, setSymbol] = useState("DAVE");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-01-01");
  const [strategy, setStrategy] = useState("rsi_mean_reversion");
  const [params, setParams] = useState({});

  useEffect(() => {
    const strat = strategies[strategy];
    if (strat) {
      const defaults = {};
      strat.parameters.forEach((p) => (defaults[p.name] = p.default));
      setParams(defaults);
    }
  }, [strategy, strategies]);

  const handleParamChange = (name, value) => {
    setParams((prev) => ({ ...prev, [name]: Number(value) || value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      symbol,
      start_date: startDate,
      end_date: endDate,
      strategy,
      parameters: params,
    });
  };

  const current = strategies[strategy];

  return (
    <form className="backtest-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. AAPL"
          />
        </div>
        <div className="form-group">
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Strategy</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            {Object.entries(strategies).map(([key, val]) => (
              <option key={key} value={key}>
                {val.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {current && <p className="strategy-description">{current.description}</p>}

      {current && (
        <div className="form-row">
          {current.parameters.map((p) => (
            <div className="form-group" key={p.name}>
              <label>{p.label}</label>
              <input
                type="number"
                value={params[p.name] ?? p.default}
                min={p.min}
                max={p.max}
                onChange={(e) => handleParamChange(p.name, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? "Running Backtest\u2026" : "Run Backtest"}
      </button>
    </form>
  );
}
