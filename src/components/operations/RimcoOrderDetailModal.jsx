import { useState } from "react";
import { Modal, Tooltip, DatePicker, Popconfirm } from "antd";
import toast from "react-hot-toast";
import {
  FiExternalLink,
  FiDownload,
  FiTruck,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiPackage,
  FiUser,
  FiDollarSign,
} from "react-icons/fi";
import {
  useSnoozeRimcoOrderMutation,
  useUnsnoozeRimcoOrderMutation,
  useCompleteRimcoOrderMutation,
  useCancelRimcoOrderMutation,
} from "../../Redux/rimcoApis";

const STATUS_PILLS = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing", bg: "#FEE2E2", text: "#DC2626" },
  { key: "ready_to_ship", label: "Ready to ship", bg: "#FEF3C7", text: "#D97706" },
  { key: "shipped", label: "Shipped", bg: "#D1FAE5", text: "#059669" },
  { key: "completed", label: "Completed", bg: "#D1FAE5", text: "#059669" },
  { key: "backorder", label: "Backorder", bg: "#F3F4F6", text: "#4B5563" },
  { key: "fulfillable_backorders", label: "Fulfillable backorders", bg: "#E0E7FF", text: "#4338CA" },
  { key: "snoozed", label: "Snoozed", bg: "#F5F3FF", text: "#6D28D9" },
  { key: "created", label: "Created", bg: "#FCE7F3", text: "#DB2777" },
  { key: "address_validation_error", label: "Address Validation Error", bg: "#FFE4E6", text: "#E11D48" },
  { key: "deleted", label: "Deleted", bg: "#F3F4F6", text: "#9CA3AF" }
];

const renderStatusTag = (statusStr) => {
  const st = (statusStr || "created").toLowerCase();
  const match = STATUS_PILLS.find((p) => p.key === st);

  if (st === "completed" || st === "shipped") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-900 text-emerald-100 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        Shipped / Completed
      </span>
    );
  }

  if (st === "deleted") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
        Deleted
      </span>
    );
  }

  if (match && match.bg) {
    return (
      <span
        className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
        style={{ backgroundColor: match.bg, color: match.text }}
      >
        {st.replace(/_/g, " ")}
      </span>
    );
  }

  return (
    <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 uppercase tracking-wider">
      {st.replace(/_/g, " ")}
    </span>
  );
};

const RimcoOrderDetailModal = ({ open, onClose, order, accountId, onOrderUpdated }) => {
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState(null);
  const [snoozeReason, setSnoozeReason] = useState("Customer request");

  const [snoozeOrder, { isLoading: snoozing }] = useSnoozeRimcoOrderMutation();
  const [unsnoozeOrder, { isLoading: unsnoozing }] = useUnsnoozeRimcoOrderMutation();
  const [completeOrder, { isLoading: completing }] = useCompleteRimcoOrderMutation();
  const [cancelOrder, { isLoading: canceling }] = useCancelRimcoOrderMutation();

  if (!order) return null;

  const displayRef = order.reference || `ORD-${order.id}`;
  const foreignRef = order.saleschannel_foreign_order_reference || order.saleschannel_foreign_order_id;
  const createdAt = order.created_at || order.ordered_at || "";
  const expectedDate = order.expected_shipping_date;
  const isSnoozed = order.status === "snoozed" || !!order.snoozed_until;

  const shippingAddr = order.shipping_address || {};
  const billingAddr = order.billing_address || {};
  const customer = order.customer || {};

  const lineItems = order.line_items || [];
  const shipments = order.shipments || [];

  const handleSnooze = async () => {
    if (!snoozeDate) {
      toast.error("Please pick a date to snooze until.");
      return;
    }
    const dateStr = snoozeDate.format("YYYY-MM-DD");
    try {
      await snoozeOrder({
        orderId: order.id,
        accountId,
        snooze_until: dateStr,
        snooze_reason: snoozeReason,
      }).unwrap();
      toast.success(`Order snoozed until ${dateStr}`);
      setSnoozeModalOpen(false);
      if (onOrderUpdated) onOrderUpdated();
      onClose();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to snooze order.");
    }
  };

  const handleUnsnooze = async () => {
    try {
      await unsnoozeOrder({ orderId: order.id, accountId }).unwrap();
      toast.success("Order unsnoozed successfully.");
      if (onOrderUpdated) onOrderUpdated();
      onClose();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to unsnooze order.");
    }
  };

  const handleComplete = async () => {
    try {
      await completeOrder({ orderId: order.id, accountId }).unwrap();
      toast.success("Order marked as completed.");
      if (onOrderUpdated) onOrderUpdated();
      onClose();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to complete order.");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelOrder({ orderId: order.id, accountId }).unwrap();
      toast.success("Order canceled in Rimco.");
      if (onOrderUpdated) onOrderUpdated();
      onClose();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to cancel order.");
    }
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={760}
        className="font-poppins"
      >
        <div className="pt-2 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 font-mono">
                  {displayRef}
                </h2>
                {foreignRef && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-gray-100 text-gray-700">
                    {foreignRef}
                  </span>
                )}
                {order.is_urgent === 1 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                    URGENT
                  </span>
                )}
                {order.is_b2b_order && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                    B2B
                  </span>
                )}
                {order.is_gift && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                    GIFT
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Ordered: {createdAt ? createdAt.slice(0, 19).replace("T", " ") : "—"}
                {expectedDate && ` · Expected Ship: ${expectedDate}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {renderStatusTag(order.status)}
            </div>
          </div>

          {/* Quick Actions (Rimco Lyra WMS API Actions) */}
          <div className="flex items-center justify-end gap-2 bg-[#f8f9fc] p-2.5 rounded-xl border border-gray-100">
            <span className="text-[11px] font-medium text-gray-500 mr-auto flex items-center gap-1">
              <FiPackage size={13} /> Rimco Actions:
            </span>

            {isSnoozed ? (
              <button
                type="button"
                onClick={handleUnsnooze}
                disabled={unsnoozing}
                className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition flex items-center gap-1"
              >
                <FiClock size={12} /> Unsnooze Order
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSnoozeModalOpen(true)}
                disabled={order.status === "completed" || order.status === "deleted"}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition flex items-center gap-1 disabled:opacity-40"
              >
                <FiClock size={12} /> Snooze
              </button>
            )}

            <Popconfirm
              title="Complete Order"
              description="Mark this order as completed in Rimco WMS?"
              onConfirm={handleComplete}
              okText="Yes, Complete"
              cancelText="Cancel"
            >
              <button
                type="button"
                disabled={order.status === "completed" || completing}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1 disabled:opacity-40"
              >
                <FiCheckCircle size={12} /> Complete
              </button>
            </Popconfirm>

            <Popconfirm
              title="Cancel Order"
              description="Are you sure you want to cancel this order in Rimco Lyra WMS?"
              onConfirm={handleCancel}
              okText="Yes, Cancel"
              okButtonProps={{ danger: true }}
              cancelText="No"
            >
              <button
                type="button"
                disabled={order.status === "deleted" || canceling}
                className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-semibold hover:bg-red-50 transition flex items-center gap-1 disabled:opacity-40"
              >
                <FiXCircle size={12} /> Cancel Order
              </button>
            </Popconfirm>
          </div>

          {/* Line Items Table */}
          <div>
            <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <FiPackage className="text-gray-500" /> Line Items ({lineItems.length})
            </p>
            {lineItems.length === 0 ? (
              <div className="text-xs text-gray-400 p-3 bg-gray-50 rounded-xl">
                No items recorded on this order.
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#f9fafc] text-gray-400 text-[11px] font-semibold border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3 text-left">PRODUCT</th>
                      <th className="py-2.5 px-3 text-left">SKU</th>
                      <th className="py-2.5 px-3 text-left">BARCODE (EAN)</th>
                      <th className="py-2.5 px-3 text-center">QTY</th>
                      <th className="py-2.5 px-3 text-right">PRICE</th>
                      <th className="py-2.5 px-3 text-right">VAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lineItems.map((item, idx) => {
                      const prod = item.product || {};
                      return (
                        <tr key={item.id || idx} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-semibold text-gray-800">
                            {prod.name || item.name || "Item"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-600">
                            {prod.sku || item.sku || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-500">
                            {prod.barcode || item.barcode || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-center text-gray-900">
                            {item.amount || item.quantity || 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-right text-gray-800">
                            {prod.price ? `€${prod.price}` : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-500">
                            {prod.vat ? `${prod.vat}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Addresses & Financials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f8f9fc] rounded-xl p-4 border border-gray-100 text-xs">
            {/* Shipping Address */}
            <div>
              <p className="font-bold text-gray-900 mb-2 border-b border-gray-200/60 pb-1 flex items-center gap-1.5">
                <FiUser className="text-gray-500" /> Shipping Destination
              </p>
              <div className="space-y-1 text-gray-600">
                <p className="font-semibold text-gray-800">
                  {shippingAddr.fullname || customer.name || "Customer"}
                </p>
                {shippingAddr.company && <p>{shippingAddr.company}</p>}
                <p>
                  {shippingAddr.address_line_1 || shippingAddr.street || "—"}{" "}
                  {shippingAddr.address_line_2 || ""}
                </p>
                <p>
                  {shippingAddr.postal_code || shippingAddr.zip || ""}{" "}
                  {shippingAddr.city || ""}, {shippingAddr.country || "NL"}
                </p>
                {shippingAddr.email && <p className="text-gray-500">{shippingAddr.email}</p>}
                {shippingAddr.phone && <p className="text-gray-500">{shippingAddr.phone}</p>}
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <p className="font-bold text-gray-900 mb-2 border-b border-gray-200/60 pb-1 flex items-center gap-1.5">
                <FiDollarSign className="text-gray-500" /> Financials &amp; Notes
              </p>
              <div className="space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Paid:</span>
                  <span className="font-bold text-gray-900">
                    {order.paid_total != null ? `${order.currency || "EUR"} ${order.paid_total}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Shipping Cost:</span>
                  <span>{order.shipping_cost != null ? `${order.currency || "EUR"} ${order.shipping_cost}` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax / VAT:</span>
                  <span>{order.paid_tax != null ? `${order.currency || "EUR"} ${order.paid_tax}` : "—"}</span>
                </div>
                {order.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Method:</span>
                    <span className="capitalize">{order.payment_method}</span>
                  </div>
                )}
                {order.note && (
                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Note:</span>
                    <p className="italic text-gray-700">{order.note}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Shipments & Carrier Tracking */}
          <div>
            <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <FiTruck className="text-gray-500" /> Carrier Shipments &amp; Tracking (
              {shipments.length || (order.vvb_transporter_code ? 1 : 0)})
            </p>
            {shipments.length === 0 && !order.vvb_transporter_code ? (
              <div className="text-xs text-gray-400 p-3 bg-gray-50 rounded-xl">
                No tracking barcode assigned yet. Carrier label will appear here once shipped.
              </div>
            ) : (
              <div className="space-y-2">
                {shipments.length > 0 ? (
                  shipments.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">
                            {s.courier?.name || "Standard Carrier"}
                          </span>
                          <span className="font-mono font-bold text-gray-900">
                            {s.barcode}
                          </span>
                        </div>
                        {s.shipped_at && (
                          <p className="text-[10px] text-gray-400 font-mono">
                            Shipped: {s.shipped_at.slice(0, 19).replace("T", " ")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {s.tracking_url && (
                          <a
                            href={s.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1 transition"
                          >
                            Track <FiExternalLink size={11} />
                          </a>
                        )}
                        {s.download_url && (
                          <a
                            href={s.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <FiDownload size={11} /> Label
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white text-xs">
                    <div>
                      <span className="text-gray-400">Transporter Code: </span>
                      <span className="font-mono font-bold text-gray-900">
                        {order.vvb_transporter_code}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Snooze Picker Submodal */}
      <Modal
        open={snoozeModalOpen}
        onCancel={() => setSnoozeModalOpen(false)}
        title="Snooze Rimco Order"
        onOk={handleSnooze}
        confirmLoading={snoozing}
        okText="Snooze"
        centered
        width={380}
      >
        <div className="space-y-3 pt-2 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Snooze until date:
            </label>
            <DatePicker
              value={snoozeDate}
              onChange={setSnoozeDate}
              className="w-full h-9 rounded"
              placeholder="Select date"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Reason:
            </label>
            <input
              type="text"
              value={snoozeReason}
              onChange={(e) => setSnoozeReason(e.target.value)}
              placeholder="e.g. Customer requested delayed delivery"
              className="w-full h-9 rounded border border-gray-200 px-3 text-xs"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RimcoOrderDetailModal;
