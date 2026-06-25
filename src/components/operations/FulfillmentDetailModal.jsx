import { Modal } from "antd";
import toast from "react-hot-toast";
import { FiExternalLink, FiAlertCircle } from "react-icons/fi";
import TrackingStepper from "../tracking/TrackingStepper";
import { url as API_URL } from "../../Redux/main/server";
import {
  statusMeta,
  statusToStep,
  canApprove,
  canRetry,
  isTerminal,
} from "../../utils/fulfillmentStatus";
import {
  useApproveFulfillmentMutation,
  useRejectFulfillmentMutation,
  useRetryFulfillmentMutation,
} from "../../Redux/fulfillmentApis";

const assetUrl = (p) =>
  p ? `${API_URL.replace(/\/$/, "")}/${String(p).replace(/^\//, "")}` : "";

const FulfillmentDetailModal = ({ open, onClose, order, source = "fulfillment" }) => {
  const [approve, { isLoading: approving }] = useApproveFulfillmentMutation();
  const [reject, { isLoading: rejecting }] = useRejectFulfillmentMutation();
  const [retry, { isLoading: retrying }] = useRetryFulfillmentMutation();

  if (!order) return null;
  const meta = statusMeta(order.status);
  const ship = order.ship_to || {};

  const run = async (fn, okMsg) => {
    try {
      await fn(order.id).unwrap();
      toast.success(okMsg);
      onClose();
    } catch (err) {
      toast.error(err?.data?.detail || "Action failed");
    }
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={620}>
      <div className="font-poppins pt-2">
        <div className="flex items-center justify-between mb-1 pr-6">
          <h2 className="text-base font-bold text-brand">
            Order <span className="text-gray-700">{order.bol_order_id}</span>
          </h2>
          <span
            className="text-[11px] font-semibold px-3 py-1 rounded-full"
            style={{ color: meta.color, backgroundColor: meta.bg }}
          >
            {meta.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">{order.created_at?.slice(0, 19).replace("T", " ")}</p>

        {/* Tracking */}
        <div className="mb-5">
          <TrackingStepper source={source} activeStep={statusToStep(order.status)} />
        </div>

        {/* Error banner */}
        {order.error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">
            <FiAlertCircle className="mt-0.5 flex-shrink-0" />
            <span>{order.error}</span>
          </div>
        )}

        {/* Product + Amazon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Product</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">{order.title || "—"}</p>
              <Line k="EAN" v={order.ean} />
              <Line k="ASIN" v={order.asin || "not mapped"} />
              <Line k="Qty" v={order.quantity} />
              <Line k="Bol Price" v={order.bol_price != null ? `€${order.bol_price}` : "—"} />
              <Line
                k="Amazon"
                v={order.amazon_price != null ? `€${order.amazon_price}` : "—"}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Ship To</p>
            <div className="text-xs text-gray-500 space-y-1">
              <Line k="Name" v={ship.name} />
              <Line k="Email" v={ship.email} />
              <Line k="Address" v={`${ship.street || ""} ${ship.house || ""}`.trim()} />
              <Line k="Postal" v={ship.zip} />
              <Line k="City" v={ship.city} />
              <Line k="Country" v={ship.country} />
            </div>
          </div>
        </div>

        {/* Amazon order / tracking */}
        {(order.amazon_order_id || order.tracking) && (
          <div className="bg-[#f7f8fc] rounded-xl px-4 py-3 mb-5 text-xs text-gray-500 space-y-1">
            <Line k="Amazon Order #" v={order.amazon_order_id} />
            {order.tracking && (
              <Line
                k="Tracking"
                v={`${order.tracking.transporter_code || ""} ${order.tracking.track_trace || ""}`.trim()}
              />
            )}
          </div>
        )}

        {/* Review screenshot */}
        {order.screenshot_path && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Amazon Review Screenshot
            </p>
            <a
              href={assetUrl(order.screenshot_path)}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-gray-100 overflow-hidden"
            >
              <img
                src={assetUrl(order.screenshot_path)}
                alt="Amazon review"
                className="w-full max-h-56 object-cover object-top"
              />
            </a>
          </div>
        )}

        {/* Actions */}
        {!isTerminal(order.status) && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canRetry(order.status) && (
              <button
                onClick={() => run(retry, "Order requeued")}
                disabled={retrying}
                className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => run(reject, "Order canceled")}
              disabled={rejecting}
              className="h-10 px-4 rounded-lg border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
            {canApprove(order.status) && (
              <button
                onClick={() => run(approve, "Approved — purchase will be placed")}
                disabled={approving}
                className="h-10 px-5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60 flex items-center gap-2"
              >
                <FiExternalLink size={14} /> Approve &amp; Buy
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

const Line = ({ k, v }) => (
  <div className="flex gap-2">
    <span className="w-24 text-gray-400 flex-shrink-0">{k}</span>
    <span className="text-gray-600 break-all">{v || "—"}</span>
  </div>
);

export default FulfillmentDetailModal;
