export default function SuggestionCard({ recommendation }) {
  if (!recommendation) return null;

  const { action, current_date, current_price, reason } = recommendation;

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
      </div>

      <p className="suggestion-reason">{reason}</p>
    </div>
  );
}
