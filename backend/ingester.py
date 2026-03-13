#!/usr/bin/env python3
"""
Standalone ingester script for fetching historical market data from Yahoo Finance
and storing it in the local SQLite database.

Usage:
    python ingester.py AAPL 2023-01-01 2024-01-01
"""

import argparse
import sys
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf

from database import init_db, insert_price_data, get_stored_dates


def fetch_and_store(symbol: str, start_date: str, end_date: str) -> int:
    """Fetch OHLCV data from Yahoo Finance and store any missing rows.

    Returns the number of newly ingested records.
    """
    init_db()

    stored_dates = get_stored_dates(symbol, start_date, end_date)

    # yfinance 'end' is exclusive, so add one day
    end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    df = yf.download(
        symbol,
        start=start_date,
        end=end_dt.strftime("%Y-%m-%d"),
        progress=False,
    )

    if df.empty:
        return 0

    # Newer yfinance versions may return MultiIndex columns for single tickers
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    records = []
    for ts, row in df.iterrows():
        date_str = ts.strftime("%Y-%m-%d")
        if date_str not in stored_dates:
            records.append({
                "symbol": symbol,
                "date": date_str,
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"]),
            })

    if records:
        insert_price_data(records)

    return len(records)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch and store historical market data"
    )
    parser.add_argument("symbol", help="Ticker symbol (e.g. AAPL)")
    parser.add_argument("start_date", help="Start date YYYY-MM-DD")
    parser.add_argument("end_date", help="End date YYYY-MM-DD")
    args = parser.parse_args()

    try:
        count = fetch_and_store(args.symbol, args.start_date, args.end_date)
        print(f"Ingested {count} new record(s) for {args.symbol}")
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
