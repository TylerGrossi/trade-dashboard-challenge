import { useState, useEffect } from "react";
import BacktestForm from "./components/BacktestForm";
import MetricsCards from "./components/MetricsCards";
import TradesTable from "./components/TradesTable";
import Charts from "./components/Charts";
import "./App.css";

const API = "/api";

export default function App() {
  const [strategies, setStrategies] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/strategies`)
      .then((r) => r.json())
      .then(setStrategies)
      .catch(() => {
        setStrategies({
          rsi_mean_reversion: {
            name: "RSI Mean Reversion",
            description:
              "Buy when RSI drops below the oversold threshold, sell when RSI rises above the overbought threshold.",
            parameters: [
              { name: "rsi_period", label: "RSI Period", default: 7, min: 2, max: 50 },
              { name: "oversold", label: "Oversold Threshold", default: 30, min: 1, max: 49 },
              { name: "overbought", label: "Overbought Threshold", default: 70, min: 51, max: 99 },
            ],
          },
        });
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
          <MetricsCards metrics={results.metrics} />
          <Charts
            priceData={results.price_data}
            equityCurve={results.equity_curve}
            trades={results.trades}
            rsi={results.rsi}
            sma={results.sma}
          />
          <TradesTable trades={results.trades} />
        </div>
      )}
    </div>
  );
}
