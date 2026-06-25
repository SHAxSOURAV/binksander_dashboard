// Each status maps to a colour: dot + text + soft background.
const STYLES = {
  Pending: { color: "#D97706", bg: "#FFF7E6" },
  Accepted: { color: "#16A34A", bg: "#E9F9F0" },
  Delivered: { color: "#16A34A", bg: "#E9F9F0" },
  Canceled: { color: "#DC2626", bg: "#FDECEC" },
  Cancelled: { color: "#DC2626", bg: "#FDECEC" },
  "Order Placed": { color: "#1B17E0", bg: "#EEEEFD" },
  Picking: { color: "#7C3AED", bg: "#F3EEFE" },
  Packing: { color: "#0891B2", bg: "#E5F7FB" },
  "Out for Delivery": { color: "#EA580C", bg: "#FFF1E8" },
  "In Transit": { color: "#2563EB", bg: "#EAF1FE" },
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
