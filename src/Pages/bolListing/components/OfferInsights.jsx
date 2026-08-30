/**
 * Bol-native metrics for one offer — buy-box share, product visits, star rating and
 * Bol's commission.
 *
 * Purely presentational: the values arrive from one batched request made by the page,
 * because resolving them per card meant a 20-card grid opened 20 connections against
 * a browser cap of ~6.
 *
 * Renders nothing when Bol has no data for the offer rather than a row of dashes — a
 * new listing legitimately has no visits or ratings yet.
 */
const OfferInsights = ({ insights, className = "" }) => {
  const i = insights || {};
  const stats = [
    i.buy_box != null && { label: "Buy box", value: `${i.buy_box}%` },
    i.visits != null && { label: "Visits", value: i.visits.toLocaleString() },
    i.rating != null && { label: "Rating", value: `${i.rating}★` },
    i.commission != null && { label: "Fee", value: `€${i.commission}` },
  ].filter(Boolean);

  if (stats.length === 0) return null;

  return (
    <div className={`flex items-center gap-x-3 gap-y-1 flex-wrap ${className}`}>
      {stats.map((s) => (
        <span key={s.label} className="text-[10px] text-gray-400 whitespace-nowrap">
          {s.label}{" "}
          <span className="text-gray-700 font-semibold tabular-nums">{s.value}</span>
        </span>
      ))}
    </div>
  );
};

export default OfferInsights;
