export default function SuggestionCard({ recommendation, metrics }) {
  if (!recommendation) return null;

  const { action, position, current_date, current_price, confidence, reason } =
    recommendation;

  const actionClass =
    action === "BUY" ? "profit" : action === "SELL" ? "loss" : "neutral";

  const priceText =
    current_price == null ? "N/A" : `$${Number(current_price).toFixed(2)}`;

  return (
    <div className="suggestion-card">
      <div className="suggestion-top">
        <h3>What to do now</h3>
        <div className={`suggestion-action ${actionClass}`}>{action}</div>
      </div>

      <div className="suggestion-meta">
        <span>
          As of <strong>{current_date}</strong> @ <strong>{priceText}</strong>
        </span>
        <span className="suggestion-confidence">
          Confidence: <strong>{confidence}%</strong>
        </span>
      </div>

      <div className="suggestion-position">
        Position: <strong>{position}</strong>
      </div>

      <p className="suggestion-reason">{reason}</p>

      {metrics && (
        <div className="suggestion-history">
          <span>
            Backtest Sharpe: <strong>{metrics.sharpe_ratio.toFixed(2)}</strong>
          </span>
          <span>
            Win rate: <strong>{metrics.win_probability.toFixed(1)}%</strong>
          </span>
        </div>
      )}
    </div>
  );
}

