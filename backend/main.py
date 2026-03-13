"""FastAPI backend for the Trading Backtest Dashboard."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import init_db, get_price_data
from ingester import fetch_and_store
from backtest import run_backtest
from strategies import STRATEGIES

app = FastAPI(title="Trading Backtest Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class BacktestRequest(BaseModel):
    symbol: str = "AAPL"
    start_date: str
    end_date: str
    strategy: str = "rsi_mean_reversion"
    parameters: dict = {}


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.get("/api/strategies")
def get_strategies():
    return STRATEGIES


@app.post("/api/backtest")
def backtest(req: BacktestRequest):
    symbol = req.symbol.upper().strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    # Ensure price data is available; fetch missing data automatically
    fetch_and_store(symbol, req.start_date, req.end_date)

    data = get_price_data(symbol, req.start_date, req.end_date)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"No market data found for {symbol} in the given date range.",
        )

    dates = [row["date"] for row in data]
    closes = [row["close"] for row in data]

    if len(closes) < 20:
        raise HTTPException(
            status_code=400,
            detail="Not enough data points for a meaningful backtest. "
                   "Try a wider date range.",
        )

    try:
        result = run_backtest(req.strategy, dates, closes, req.parameters)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    result["symbol"] = symbol
    result["start_date"] = req.start_date
    result["end_date"] = req.end_date
    result["strategy"] = req.strategy

    return result


# ---------------------------------------------------------------------------
# Serve built frontend in production
# ---------------------------------------------------------------------------
_frontend = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_frontend):
    app.mount("/", StaticFiles(directory=_frontend, html=True), name="frontend")
