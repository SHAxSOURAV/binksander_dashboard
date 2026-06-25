// Display metadata for fulfillment_orders statuses (label + colors) and the
// mapping to the tracking-stepper stage index.

export const STATUS_META = {
  received: { label: "Received", color: "#1B17E0", bg: "#EEEEFD" },
  mapped: { label: "Mapped", color: "#2563EB", bg: "#EAF1FE" },
  mapping_failed: { label: "Mapping Failed", color: "#DC2626", bg: "#FDECEC" },
  awaiting_approval: { label: "Awaiting Approval", color: "#D97706", bg: "#FFF7E6" },
  approved: { label: "Approved", color: "#7C3AED", bg: "#F3EEFE" },
  purchasing: { label: "Purchasing", color: "#7C3AED", bg: "#F3EEFE" },
  purchased: { label: "Purchased", color: "#0891B2", bg: "#E5F7FB" },
  purchase_failed: { label: "Purchase Failed", color: "#DC2626", bg: "#FDECEC" },
  needs_login: { label: "Needs Amazon Login", color: "#EA580C", bg: "#FFF1E8" },
  shipped: { label: "Shipped", color: "#0EA5E9", bg: "#E6F6FE" },
  completed: { label: "Completed", color: "#16A34A", bg: "#E9F9F0" },
  canceled: { label: "Canceled", color: "#6B7280", bg: "#F3F4F6" },
};

export const statusMeta = (status) =>
  STATUS_META[status] || { label: status || "—", color: "#6B7280", bg: "#F3F4F6" };

// Stepper stages: Received → Mapped → Approved → Purchased → Completed
export const FULFILLMENT_STEPS = [
  "Received",
  "Mapped",
  "Approved",
  "Purchased",
  "Completed",
];

const STATUS_TO_STEP = {
  received: 0,
  mapping_failed: 0,
  mapped: 1,
  awaiting_approval: 1,
  approved: 2,
  purchasing: 2,
  purchase_failed: 2,
  needs_login: 2,
  purchased: 3,
  shipped: 4,
  completed: 4,
  canceled: 0,
};

export const statusToStep = (status) =>
  STATUS_TO_STEP[status] != null ? STATUS_TO_STEP[status] : 0;

// Which statuses allow which actions in the UI.
export const canApprove = (s) =>
  ["awaiting_approval", "purchase_failed", "needs_login"].includes(s);
export const canRetry = (s) =>
  ["mapping_failed", "purchase_failed", "needs_login"].includes(s);
export const isTerminal = (s) => ["completed", "canceled"].includes(s);
