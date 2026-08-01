// Display metadata for fulfillment_orders statuses (label + monochrome colors) and the
// mapping to the tracking-stepper stage index.

export const STATUS_META = {
  received: { label: "Received", color: "#333333", bg: "#f0f0f0" },
  mapped: { label: "Mapped", color: "#262626", bg: "#ebebeb" },
  mapping_failed: { label: "Mapping Failed", color: "#737373", bg: "#f5f5f5" },
  awaiting_approval: { label: "Awaiting Approval", color: "#525252", bg: "#f5f5f5" },
  approved: { label: "Approved", color: "#333333", bg: "#f0f0f0" },
  purchasing: { label: "Purchasing", color: "#333333", bg: "#f0f0f0" },
  purchased: { label: "Purchased", color: "#1a1a1a", bg: "#ebebeb" },
  purchase_failed: { label: "Purchase Failed", color: "#737373", bg: "#f5f5f5" },
  needs_login: { label: "Needs Amazon Login", color: "#525252", bg: "#f5f5f5" },
  shipped: { label: "Shipped", color: "#1a1a1a", bg: "#ebebeb" },
  completed: { label: "Completed", color: "#111111", bg: "#e5e5e5" },
  canceled: { label: "Canceled", color: "#a3a3a3", bg: "#f5f5f5" },
  pending: { label: "Pending", color: "#525252", bg: "#f5f5f5" },
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
export const isTerminal = (s) =>
  ["completed", "canceled", "shipped", "deleted"].includes((s || "").toLowerCase());
