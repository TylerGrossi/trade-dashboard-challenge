# Trading Backtest Dashboard

A full-stack web application for backtesting trading strategies on historical market data.

**Tech stack:** FastAPI · React · SQLite · yfinance · Recharts

---

## Trading Strategies

Three strategies are implemented. Users select a strategy from the frontend dropdown and configure its parameters before running a backtest.

### 1. RSI Mean Reversion

The Relative Strength Index (RSI) measures the speed and magnitude of recent price changes to identify overbought or oversold conditions. RSI is computed using Wilder's exponential smoothing.

| Signal | Condition |
|--------|-----------|
| **Buy** | RSI drops below the *oversold* threshold (default 30) |
| **Sell** | RSI rises above the *overbought* threshold (default 70) |

| Parameter | Description | Default |
|-----------|-------------|---------|
| RSI Period | Lookback window for RSI calculation | 7 |
| Oversold | RSI level that triggers a buy | 30 |
| Overbought | RSI level that triggers a sell | 70 |

### 2. SMA Crossover

Uses two Simple Moving Averages (short and long period). A "golden cross" (short SMA crosses above long SMA) signals a buy; a "death cross" (short crosses below long) signals a sell.

| Parameter | Description | Default |
|-----------|-------------|---------|
| Short SMA Window | Period for the fast moving average | 20 |
| Long SMA Window | Period for the slow moving average | 50 |

### 3. Price Threshold

The simplest strategy: buy when the price crosses from below to above a fixed dollar threshold, then automatically close the position after a set number of trading days.

| Parameter | Description | Default |
|-----------|-------------|---------|
| Price Threshold ($) | Price level that triggers a buy | 150 |
| Holding Period (days) | Number of trading days to hold before closing | 10 |

---

## Architecture

```
trade-dashboard-challenge/
├── backend/
│   ├── main.py            # FastAPI server & API routes
│   ├── database.py        # SQLite schema & queries
│   ├── ingester.py        # Standalone data-fetching script (yfinance)
│   ├── strategies.py      # Strategy implementations & parameter registry
│   ├── backtest.py        # Backtesting engine & metric calculations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Root component & state management
│   │   ├── App.css        # Global styles (dark theme)
│   │   └── components/
│   │       ├── BacktestForm.jsx   # Dynamic form from strategy parameters
│   │       ├── MetricsCards.jsx   # Performance metric cards
│   │       ├── TradesTable.jsx    # Trade log with CSV export
│   │       └── Charts.jsx        # Price, indicator, and equity charts
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Data flow

1. User selects a strategy, fills in symbol, date range, and strategy parameters on the frontend.
2. Frontend sends a `POST /api/backtest` request to the backend.
3. Backend calls the **ingester** to fetch any missing price data from Yahoo Finance and stores it in **SQLite**.
4. Backend runs the selected strategy on the data, computes trades and performance metrics, and returns everything as JSON.
5. Frontend renders metric cards, interactive charts with custom tooltips (price chart with buy/sell markers, strategy-specific indicator chart, equity curve), and a trades table with CSV export.

---

## Quick Start

### Option 1: Docker (recommended)

```bash
docker-compose up --build
```

Open **http://localhost:8000** in your browser.

### Option 2: Run locally

**Backend** (terminal 1):

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** (Vite proxies API requests to port 8000).

### Standalone Ingester

You can pre-populate the database without starting the server:

```bash
cd backend
python ingester.py DAVE 2024-01-01 2026-01-01
```

If data is missing when a backtest is requested through the web interface, the backend calls the ingester automatically.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/strategies` | List available strategies with their parameter definitions |
| `POST` | `/api/backtest` | Run a backtest and return trades + metrics |

### `POST /api/backtest` – example requests

**RSI Mean Reversion:**
```json
{
  "symbol": "DAVE",
  "start_date": "2024-01-01",
  "end_date": "2026-01-01",
  "strategy": "rsi_mean_reversion",
  "parameters": {
    "rsi_period": 7,
    "oversold": 30,
    "overbought": 70
  }
}
```

**SMA Crossover:**
```json
{
  "symbol": "DAVE",
  "start_date": "2024-01-01",
  "end_date": "2026-01-01",
  "strategy": "sma_crossover",
  "parameters": {
    "short_window": 20,
    "long_window": 50
  }
}
```

**Price Threshold:**
```json
{
  "symbol": "DAVE",
  "start_date": "2024-01-01",
  "end_date": "2026-01-01",
  "strategy": "price_threshold",
  "parameters": {
    "threshold": 150,
    "hold_days": 10
  }
}
```

### Response includes

- **trades** – every individual trade (entry/exit dates, prices, P&L)
- **metrics** – total P&L, annualized return, max drawdown, win probability, Sharpe ratio
- **price_data** – daily close prices for charting
- **rsi** – daily RSI values (RSI strategy only)
- **sma** – daily short/long SMA values (SMA strategy only)
- **equity_curve** – cumulative P&L over time

---

## Metrics Glossary

| Metric | Description |
|--------|-------------|
| **Total P&L** | Sum of (exit price − entry price) for every trade |
| **Annualized Return** | `(1 + total_return)^(1/years) − 1` |
| **Sharpe Ratio** | Risk-adjusted return: annualized mean trade return / standard deviation |
| **Max Drawdown** | Largest peak-to-trough decline in cumulative P&L |
| **Win Probability** | Winning trades / total trades × 100 |

---

## Features

- Three trading strategies with configurable parameters
- Dynamic frontend that auto-generates parameter forms from the backend registry
- Automatic data ingestion — missing market data is fetched on demand
- Interactive charts with custom tooltips (price, RSI, SMA overlay, equity curve)
- Buy/sell trade markers on the price chart
- CSV export for the trades table
- Dark-themed, responsive UI
- Dockerized for one-command deployment

---

## Acknowledgments

This project was built with the assistance of AI tooling (Cursor / Claude) for code generation and development guidance.
