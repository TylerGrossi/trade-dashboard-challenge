import { useState, useEffect } from "react";

function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayLocalDateString() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatLocalDate(today);
}

/** Very early start so “All Time” includes the ticker's full available history on Yahoo Finance. */
const ALL_TIME_START = "1900-01-01";

/**
 * @param {'allTime' | 'last5y' | 'last1y' | 'ytd' | 'last6m'} preset
 */
function rangeForPreset(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endStr = formatLocalDate(today);

  if (preset === "allTime") {
    return { start: ALL_TIME_START, end: endStr };
  }
  if (preset === "last5y") {
    const start = new Date(today);
    start.setFullYear(start.getFullYear() - 5);
    return { start: formatLocalDate(start), end: endStr };
  }
  if (preset === "last1y") {
    const start = new Date(today);
    start.setFullYear(start.getFullYear() - 1);
    return { start: formatLocalDate(start), end: endStr };
  }
  if (preset === "ytd") {
    const start = new Date(today.getFullYear(), 0, 1);
    return { start: formatLocalDate(start), end: endStr };
  }
  if (preset === "last6m") {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 6);
    return { start: formatLocalDate(start), end: endStr };
  }
  throw new Error(`Unknown date preset: ${preset}`);
}

const DATE_RANGE_PRESETS = [
  { id: "allTime", label: "All Time" },
  { id: "last5y", label: "Last 5 years" },
  { id: "last1y", label: "Last Year" },
  { id: "ytd", label: "YTD" },
  { id: "last6m", label: "6 Months" },
];

export default function BacktestForm({ strategies, onSubmit, loading }) {
  const [symbol, setSymbol] = useState("DAVE");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState(todayLocalDateString);
  const [datePreset, setDatePreset] = useState("custom");
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
    const n = Number(value);
    setParams((prev) => ({
      ...prev,
      [name]:
        value === "" || value === "-"
          ? value
          : Number.isFinite(n)
            ? n
            : prev[name],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parameters = { ...params };
    if (current) {
      for (const p of current.parameters) {
        const n = Number(parameters[p.name]);
        if (!Number.isFinite(n)) {
          parameters[p.name] = p.default;
        }
      }
    }
    onSubmit({
      symbol,
      start_date: startDate,
      end_date: endDate,
      strategy,
      parameters,
    });
  };

  const current = strategies[strategy];

  const applyDatePreset = (id) => {
    setDatePreset(id);
    const { start, end } = rangeForPreset(id);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <form className="backtest-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group form-group-full">
          <label>Date range</label>
          <div className="date-range-segments" role="group" aria-label="Date range">
            {DATE_RANGE_PRESETS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`date-range-segment ${datePreset === id ? "active" : ""}`}
                onClick={() => applyDatePreset(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

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
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setDatePreset("custom");
              setStartDate(e.target.value);
            }}
          />
        </div>
        <div className="form-group">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setDatePreset("custom");
              setEndDate(e.target.value);
            }}
          />
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
                step={p.type === "float" ? "any" : 1}
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
