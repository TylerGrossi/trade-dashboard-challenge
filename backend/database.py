"""SQLite database operations for storing historical market data."""

import sqlite3
import os
from pathlib import Path

DB_PATH = Path(os.environ.get(
    "DB_PATH",
    str(Path(__file__).parent / "data" / "market_data.db")
))


def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS price_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            UNIQUE(symbol, date)
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_symbol_date
        ON price_data (symbol, date)
    """)
    conn.commit()
    conn.close()


def get_price_data(symbol, start_date, end_date):
    conn = get_connection()
    rows = conn.execute(
        "SELECT date, open, high, low, close, volume FROM price_data "
        "WHERE symbol = ? AND date >= ? AND date <= ? ORDER BY date",
        (symbol, start_date, end_date)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_stored_dates(symbol, start_date, end_date):
    conn = get_connection()
    rows = conn.execute(
        "SELECT DISTINCT date FROM price_data "
        "WHERE symbol = ? AND date >= ? AND date <= ?",
        (symbol, start_date, end_date)
    ).fetchall()
    conn.close()
    return {r["date"] for r in rows}


def insert_price_data(records):
    conn = get_connection()
    conn.executemany(
        "INSERT OR IGNORE INTO price_data "
        "(symbol, date, open, high, low, close, volume) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            (r["symbol"], r["date"], r["open"], r["high"],
             r["low"], r["close"], r["volume"])
            for r in records
        ]
    )
    conn.commit()
    conn.close()
