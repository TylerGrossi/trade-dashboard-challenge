import { useState, useEffect } from "react";
import BacktestForm from "./components/BacktestForm";
import MetricsCards from "./components/MetricsCards";
import TradesTable from "./components/TradesTable";
import Charts from "./components/Charts";
import SuggestionCard from "./components/SuggestionCard";
import { STRATEGY_DEFAULTS } from "./strategyDefaults";
import "./App.css";

const API = "/api";

export default function App() {
  const [strategies, setStrategies] = useState(STRATEGY_DEFAULTS);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/strategies`)
      .then((r) => {
        if (!r.ok) throw new Error(`strategies ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length) {
          setStrategies(data);
        }
      })
      .catch(() => {
        setStrategies({ ...STRATEGY_DEFAULTS });
      });
  }, []);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`${API}/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }

      setResults(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Trading Backtest Dashboard</h1>
        <p>Backtest trading strategies on historical market data</p>
      </header>

      <BacktestForm strategies={strategies} onSubmit={handleSubmit} loading={loading} />

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Running backtest&hellip;</span>
        </div>
      )}

      {results && (
        <div className="results">
          {results.recommendation && (
            <SuggestionCard recommendation={results.recommendation} />
          )}
          <MetricsCards metrics={results.metrics} />
          <Charts
            priceData={results.price_data}
            equityCurve={results.equity_curve}
            trades={results.trades}
            rsi={results.rsi}
            sma={results.sma}
            bollinger={results.bollinger}
            zscore={results.zscore}
            zscoreLevels={results.zscore_levels}
            recommendation={results.recommendation}
          />
          <TradesTable trades={results.trades} />
        </div>
      )}
    </div>
  );
}
