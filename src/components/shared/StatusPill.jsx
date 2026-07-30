// Each status maps to a monochrome colour: dot + text + soft background.
const STYLES = {
  Pending: { color: "#525252", bg: "#f5f5f5" },
  Accepted: { color: "#1a1a1a", bg: "#f0f0f0" },
  Delivered: { color: "#1a1a1a", bg: "#f0f0f0" },
  Canceled: { color: "#737373", bg: "#f5f5f5" },
  Cancelled: { color: "#737373", bg: "#f5f5f5" },
  "Order Placed": { color: "#111111", bg: "#ebebeb" },
  Picking: { color: "#333333", bg: "#f0f0f0" },
  Packing: { color: "#404040", bg: "#f0f0f0" },
  "Out for Delivery": { color: "#333333", bg: "#ebebeb" },
  "In Transit": { color: "#262626", bg: "#f0f0f0" },
};

const DEFAULT = { color: "#6B7280", bg: "#F3F4F6" };

const StatusPill = ({ status }) => {
  const s = STYLES[status] || DEFAULT;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: s.color }}
      />
      {status}
    </span>
  );
};

export default StatusPill;
