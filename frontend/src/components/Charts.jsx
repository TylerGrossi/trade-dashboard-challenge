import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from "recharts";

const TT = {
  backgroundColor: "#1c2333",
  border: "1px solid #30363d",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "0.82rem",
  lineHeight: 1.6,
};

function fmtTick(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

function PriceTooltip({ active, payload, label, trades, recommendation }) {
  if (!active || !payload?.length) return null;
  const close = payload[0]?.value;
  const buy = trades.find((t) => t.entry_date === label);
  const sell = trades.find((t) => t.exit_date === label);

  // On the latest bar ("today"), show the backend recommendation instead of
  // raw BUY/SELL trade markers (entry/exit can be confusing at the boundary).
  const isLatest = recommendation?.current_date === label;
  if (isLatest && recommendation) {
    const action = recommendation.action;
    const color =
      action === "BUY" ? "#3fb950" : action === "SELL" ? "#f85149" : "#58a6ff";

    return (
      <div style={TT}>
        <div style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>{fmtDate(label)}</div>
        <div style={{ color: "#8b949e" }}>
          Price: <span style={{ color: "#58a6ff" }}>${close?.toFixed(2)}</span>
        </div>
        <div style={{ color, fontWeight: 800, marginTop: 6 }}>
          RECOMMENDED: {action}
        </div>
      </div>
    );
  }

  // Strategies close any open position at the end of the window.
  // If entry and exit happen on the same bar at the same price (0 P&L),
  // showing both BUY and SELL markers at the end is confusing.
  const hideSell =
    Boolean(
      buy &&
        sell &&
        buy.entry_date === sell.exit_date &&
        Number(buy.entry_price) === Number(sell.exit_price)
    ) || false;

  return (
    <div style={TT}>
      <div style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>{fmtDate(label)}</div>
      <div style={{ color: "#8b949e" }}>
        Price: <span style={{ color: "#58a6ff" }}>${close?.toFixed(2)}</span>
      </div>
      {buy && (
        <div style={{ color: "#3fb950", fontWeight: 600, marginTop: 2 }}>
          BUY @ ${buy.entry_price.toFixed(2)}
        </div>
      )}
      {sell && !hideSell && (
        <div style={{ color: "#f85149", fontWeight: 600, marginTop: 2 }}>
          SELL @ ${sell.exit_price.toFixed(2)} &nbsp;(
          {sell.pnl >= 0 ? "+" : ""}${sell.pnl.toFixed(2)})
        </div>
      )}
    </div>
  );
}

function RsiTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const rsi = payload[0]?.value;
  if (rsi == null) return null;

  let zone = "Neutral";
  let color = "#d2a8ff";
  if (rsi < 30) { zone = "Oversold"; color = "#3fb950"; }
  else if (rsi > 70) { zone = "Overbought"; color = "#f85149"; }

  return (
    <div style={TT}>
      <div style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>{fmtDate(label)}</div>
      <div style={{ color: "#8b949e" }}>
        RSI: <span style={{ color: "#d2a8ff" }}>{rsi.toFixed(1)}</span>
      </div>
      <div style={{ color, fontWeight: 500, marginTop: 2 }}>{zone}</div>
    </div>
  );
}

function SmaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const close = payload.find((p) => p.dataKey === "close")?.value;
  const short = payload.find((p) => p.dataKey === "short")?.value;
  const long = payload.find((p) => p.dataKey === "long")?.value;

  return (
    <div style={TT}>
      <div style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>{fmtDate(label)}</div>
      {close != null && (
        <div style={{ color: "#8b949e" }}>
          Price: <span style={{ color: "#58a6ff" }}>${close.toFixed(2)}</span>
        </div>
      )}
      {short != null && (
        <div style={{ color: "#8b949e" }}>
          Short SMA: <span style={{ color: "#3fb950" }}>${short.toFixed(2)}</span>
        </div>
      )}
      {long != null && (
        <div style={{ color: "#8b949e" }}>
          Long SMA: <span style={{ color: "#f85149" }}>${long.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function BollingerTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const close = payload.find((p) => p.dataKey === "close")?.value;
  const upper = payload.find((p) => p.dataKey === "bbUpper")?.value;
  const middle = payload.find((p) => p.dataKey === "bbMiddle")?.value;
  const lower = payload.find((p) => p.dataKey === "bbLower")?.value;

  return (
    <div style={TT}>
      <div style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>{fmtDate(label)}</div>
      {close != null && (
        <div style={{ color: "#8b949e" }}>
          Price: <span style={{ color: "#58a6ff" }}>${close.toFixed(2)}</span>
        </div>
      )}
      {upper != null && (
        <div style={{ color: "#8b949e" }}>
          Upper: <span style={{ color: "#f85149" }}>${upper.toFixed(2)}</span>
        </div>
      )}
      {middle != null && (
        <div style={{ color: "#8b949e" }}>
          Middle: <span style={{ color: "#8b949e" }}>${middle.toFixed(2)}</span>
        </div>
      )}
      {lower != null && (
        <div style={{ color: "#8b949e" }}>
          Lower: <span style={{ color: "#3fb950" }}>${lower.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function ZscoreTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const z = row?.z;
  const mean = row?.mean;
  if (z == null && mean == null) return null;

  return (
    <div style={TT}>
      <div style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>{fmtDate(label)}</div>
      {z != null && (
        <div style={{ color: "#8b949e" }}>
          Z-score: <span style={{ color: "#d2a8ff" }}>{z.toFixed(3)}</span>
        </div>
      )}
      {mean != null && (
        <div style={{ color: "#8b949e" }}>
          Rolling mean: <span style={{ color: "#8b949e" }}>${mean.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function ZscoreMeanTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const close = payload.find((p) => p.dataKey === "close")?.value;
  const mean = payload.find((p) => p.dataKey === "rollingMean")?.value;

  return (
    <div style={TT}>
      <div style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>{fmtDate(label)}</div>
      {close != null && (
        <div style={{ color: "#8b949e" }}>
          Price: <span style={{ color: "#58a6ff" }}>${close.toFixed(2)}</span>
        </div>
      )}
      {mean != null && (
        <div style={{ color: "#8b949e" }}>
          Rolling mean: <span style={{ color: "#d2a8ff" }}>${mean.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function EquityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const eq = payload[0]?.value;

  return (
    <div style={TT}>
      <div style={{ color: "#e6edf3", fontWeight: 600, marginBottom: 4 }}>{fmtDate(label)}</div>
      <div style={{ color: "#8b949e" }}>
        P&L:{" "}
        <span style={{ color: eq >= 0 ? "#3fb950" : "#f85149", fontWeight: 600 }}>
          {eq >= 0 ? "+" : ""}${eq?.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export default function Charts({
  priceData,
  equityCurve,
  trades,
  rsi,
  sma,
  bollinger,
  zscore,
  zscoreLevels,
  recommendation,
}) {
  const latestDate = priceData?.[priceData.length - 1]?.date;
  const latestClose = priceData?.[priceData.length - 1]?.close;

  const recommendedFill =
    recommendation?.action === "BUY"
      ? "#3fb950"
      : recommendation?.action === "SELL"
        ? "#f85149"
        : "#58a6ff";

  // Merge SMA data with price data for the overlay chart
  const smaChartData = useMemo(() => {
    if (!sma || !priceData) return null;
    const smaMap = Object.fromEntries(sma.map((s) => [s.date, s]));
    return priceData.map((p) => ({
      ...p,
      short: smaMap[p.date]?.short ?? null,
      long: smaMap[p.date]?.long ?? null,
    }));
  }, [sma, priceData]);

  const bollingerChartData = useMemo(() => {
    if (!bollinger || !priceData) return null;
    const bbMap = Object.fromEntries(bollinger.map((b) => [b.date, b]));
    return priceData.map((p) => ({
      ...p,
      bbUpper: bbMap[p.date]?.upper ?? null,
      bbMiddle: bbMap[p.date]?.middle ?? null,
      bbLower: bbMap[p.date]?.lower ?? null,
    }));
  }, [bollinger, priceData]);

  const zscoreMeanChartData = useMemo(() => {
    if (!zscore || !priceData) return null;
    const zm = Object.fromEntries(zscore.map((z) => [z.date, z]));
    return priceData.map((p) => ({
      ...p,
      rollingMean: zm[p.date]?.mean ?? null,
    }));
  }, [zscore, priceData]);

  return (
    <div className="charts">
      {/* ---- Price chart with buy/sell markers ---- */}
      <div className="chart-container">
        <h3>Price &amp; Trade Signals</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={priceData}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#58a6ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis
              dataKey="date"
              stroke="#8b949e"
              fontSize={11}
              tickFormatter={fmtTick}
              interval="preserveStartEnd"
            />
            <YAxis stroke="#8b949e" fontSize={11} domain={["auto", "auto"]} />
            <Tooltip content={<PriceTooltip trades={trades} recommendation={recommendation} />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#58a6ff"
              fill="url(#priceGrad)"
              strokeWidth={2}
              dot={false}
              name="Price"
            />
            {trades.map((t, i) => {
              const zeroLength =
                t.exit_date === t.entry_date && Number(t.exit_price) === Number(t.entry_price);
              if (zeroLength) return null;
              if (latestDate && t.entry_date === latestDate) return null;
              return (
                <ReferenceDot
                  key={`b${i}`}
                  x={t.entry_date}
                  y={t.entry_price}
                  r={5}
                  fill="#3fb950"
                  stroke="none"
                />
              );
            })}
            {trades.map((t, i) => {
              const zeroLength =
                t.exit_date === t.entry_date && Number(t.exit_price) === Number(t.entry_price);
              if (zeroLength) return null;
              if (latestDate && t.exit_date === latestDate) return null;
              return (
                <ReferenceDot
                  key={`s${i}`}
                  x={t.exit_date}
                  y={t.exit_price}
                  r={5}
                  fill="#f85149"
                  stroke="none"
                />
              );
            })}

            {latestDate && latestClose != null && recommendation && (
              <ReferenceDot
                x={latestDate}
                y={latestClose}
                r={6}
                fill={recommendedFill}
                stroke="none"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          <span className="legend-item"><span className="dot buy" /> Buy</span>
          <span className="legend-item"><span className="dot sell" /> Sell</span>
        </div>
      </div>

      {/* ---- RSI chart (RSI strategy) ---- */}
      {rsi && rsi.length > 0 && (
        <div className="chart-container">
          <h3>RSI Indicator</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={rsi}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="date" stroke="#8b949e" fontSize={11} tickFormatter={fmtTick} interval="preserveStartEnd" />
              <YAxis stroke="#8b949e" fontSize={11} domain={[0, 100]} ticks={[0, 30, 50, 70, 100]} />
              <Tooltip content={<RsiTooltip />} />
              <ReferenceLine y={30} stroke="#3fb950" strokeDasharray="5 5" />
              <ReferenceLine y={70} stroke="#f85149" strokeDasharray="5 5" />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#d2a8ff"
                fill="rgba(210,168,255,0.1)"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                name="RSI"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ---- SMA overlay chart (SMA strategy) ---- */}
      {smaChartData && (
        <div className="chart-container">
          <h3>SMA Crossover Indicator</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={smaChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="date" stroke="#8b949e" fontSize={11} tickFormatter={fmtTick} interval="preserveStartEnd" />
              <YAxis stroke="#8b949e" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip content={<SmaTooltip />} />
              <Line type="monotone" dataKey="close" stroke="#58a6ff" strokeWidth={1.5} dot={false} name="Price" />
              <Line type="monotone" dataKey="short" stroke="#3fb950" strokeWidth={2} dot={false} connectNulls name="Short SMA" />
              <Line type="monotone" dataKey="long" stroke="#f85149" strokeWidth={2} dot={false} connectNulls name="Long SMA" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <span className="legend-item"><span className="dot" style={{ background: "#58a6ff" }} /> Price</span>
            <span className="legend-item"><span className="dot buy" /> Short SMA</span>
            <span className="legend-item"><span className="dot sell" /> Long SMA</span>
          </div>
        </div>
      )}

      {/* ---- Price vs rolling mean (Z-score mean reversion) ---- */}
      {zscoreMeanChartData && (
        <div className="chart-container">
          <h3>Price vs Rolling Mean</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={zscoreMeanChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="date" stroke="#8b949e" fontSize={11} tickFormatter={fmtTick} interval="preserveStartEnd" />
              <YAxis stroke="#8b949e" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip content={<ZscoreMeanTooltip />} />
              <Line type="monotone" dataKey="close" stroke="#58a6ff" strokeWidth={1.5} dot={false} name="Price" />
              <Line
                type="monotone"
                dataKey="rollingMean"
                stroke="#d2a8ff"
                strokeWidth={2}
                dot={false}
                connectNulls
                name="Rolling mean"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <span className="legend-item"><span className="dot" style={{ background: "#58a6ff" }} /> Price</span>
            <span className="legend-item"><span className="dot" style={{ background: "#d2a8ff" }} /> Rolling mean</span>
          </div>
        </div>
      )}

      {zscore && zscore.length > 0 && zscoreLevels && (
        <div className="chart-container">
          <h3>Z-Score (distance from rolling mean)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={zscore}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="date" stroke="#8b949e" fontSize={11} tickFormatter={fmtTick} interval="preserveStartEnd" />
              <YAxis stroke="#8b949e" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip content={<ZscoreTooltip />} />
              <ReferenceLine y={zscoreLevels.entry_line} stroke="#3fb950" strokeDasharray="5 5" />
              <ReferenceLine y={zscoreLevels.exit_line} stroke="#f85149" strokeDasharray="5 5" />
              <Area
                type="monotone"
                dataKey="z"
                stroke="#d2a8ff"
                fill="rgba(210,168,255,0.08)"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                name="Z-score"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ---- Bollinger Bands overlay ---- */}
      {bollingerChartData && (
        <div className="chart-container">
          <h3>Bollinger Bands</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={bollingerChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="date" stroke="#8b949e" fontSize={11} tickFormatter={fmtTick} interval="preserveStartEnd" />
              <YAxis stroke="#8b949e" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip content={<BollingerTooltip />} />
              <Line type="monotone" dataKey="close" stroke="#58a6ff" strokeWidth={1.5} dot={false} name="Price" />
              <Line type="monotone" dataKey="bbUpper" stroke="#f85149" strokeWidth={1.25} dot={false} connectNulls strokeDasharray="4 3" name="Upper" />
              <Line type="monotone" dataKey="bbMiddle" stroke="#8b949e" strokeWidth={1} dot={false} connectNulls name="Middle (SMA)" />
              <Line type="monotone" dataKey="bbLower" stroke="#3fb950" strokeWidth={1.25} dot={false} connectNulls strokeDasharray="4 3" name="Lower" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <span className="legend-item"><span className="dot" style={{ background: "#58a6ff" }} /> Price</span>
            <span className="legend-item"><span className="dot sell" /> Upper</span>
            <span className="legend-item"><span className="dot" style={{ background: "#8b949e" }} /> Middle</span>
            <span className="legend-item"><span className="dot buy" /> Lower</span>
          </div>
        </div>
      )}

      {/* ---- Equity curve ---- */}
      <div className="chart-container">
        <h3>Equity Curve (Cumulative P&amp;L)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={equityCurve}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3fb950" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3fb950" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="date" stroke="#8b949e" fontSize={11} tickFormatter={fmtTick} interval="preserveStartEnd" />
            <YAxis stroke="#8b949e" fontSize={11} />
            <Tooltip content={<EquityTooltip />} />
            <ReferenceLine y={0} stroke="#8b949e" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#3fb950"
              fill="url(#eqGrad)"
              strokeWidth={2}
              dot={false}
              name="Equity"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
