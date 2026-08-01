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

  // Adapt fields for both local fulfillment order format AND Rimco WMS format
  const displayId = order.reference || order.saleschannel_foreign_order_reference || order.bol_order_id || `ORD-${order.id}`;
  const createdAt = order.created_at || order.ordered_at || "";

  // Product extraction
  const firstItem = order.line_items?.[0] || {};
  const productTitle = order.title || firstItem.product?.name || firstItem.name || "—";
  const productEan = order.ean || firstItem.product?.barcode || "—";
  const productAsin = order.asin || firstItem.product?.sku || "not mapped";
  const productQty = order.quantity != null ? order.quantity : (firstItem.amount != null ? firstItem.amount : 1);
  const bolPriceDisplay = order.bol_price != null ? `€${order.bol_price}` : (order.paid_total != null ? `€${order.paid_total}` : "—");
  const amazonPriceDisplay = order.amazon_price != null ? `€${order.amazon_price}` : "—";

  // Ship To extraction
  const shipObj = order.ship_to || {};
  const addrObj = order.shipping_address || {};
  const customerObj = order.customer || {};

  const recipientName = shipObj.name || addrObj.fullname || customerObj.name || "—";
  const recipientEmail = shipObj.email || addrObj.email || customerObj.email || "—";
  const recipientAddress = shipObj.address || (`${addrObj.address_line_1 || ""} ${addrObj.address_line_2 || ""}`).trim() || `${shipObj.street || ""} ${shipObj.house || ""}`.trim() || "—";
  const recipientPostal = shipObj.zip || addrObj.postal_code || "—";
  const recipientCity = shipObj.city || addrObj.city || "—";
  const recipientCountry = shipObj.country || addrObj.country || "—";

  // Shipments & Tracking extraction
  const shipment = order.shipments?.[0] || {};
  const trackingBarcode = order.tracking?.track_trace || shipment.barcode || order.vvb_transporter_code || "";
  const transporterCode = order.tracking?.transporter_code || shipment.courier?.name || order.vvb_transporter_code || "Carrier";

  // Build working carrier tracking URL
  let trackingUrl = order.tracking?.url || shipment.tracking_url || null;
  if (!trackingUrl && trackingBarcode && trackingBarcode !== "N/A" && trackingBarcode !== "—") {
    if (trackingBarcode.startsWith("JVGL") || transporterCode.toLowerCase().includes("dhl")) {
      trackingUrl = `https://dhlparcel.nl/nl/particulier/ontvangen/volg-uw-zending?tt=${trackingBarcode}`;
    } else {
      trackingUrl = `https://postnl.nl/tracktrace/?B=${trackingBarcode}`;
    }
  }

  // Build working label download URL
  let downloadUrl = shipment.download_url || null;
  if (!downloadUrl && shipment.label) {
    downloadUrl = shipment.label.startsWith("http")
      ? shipment.label
      : `https://lyrawms-delivery.ams3.digitaloceanspaces.com/${shipment.label.replace(/^\//, "")}`;
  }

  const meta = statusMeta(order.status);

  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={640} className="font-poppins">
      <div className="pt-2 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              Order <span className="text-gray-700 font-mono">{displayId}</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {createdAt ? createdAt.slice(0, 19).replace("T", " ") : "—"}
            </p>
          </div>
          <span
            className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
            style={{ color: meta.color, backgroundColor: meta.bg }}
          >
            {meta.label}
          </span>
        </div>

        {/* Tracking Stepper */}
        <div>
          <TrackingStepper source={source} activeStep={statusToStep(order.status)} />
        </div>

        {/* Error banner if any */}
        {order.error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs rounded-xl p-3 border border-red-100">
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <span>{order.error}</span>
          </div>
        )}

        {/* Product + Ship To details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f8f9fc] rounded-xl p-4 border border-gray-100">
          <div>
            <p className="text-xs font-bold text-gray-900 mb-2 border-b border-gray-200/60 pb-1">Product Details</p>
            <div className="text-xs space-y-1.5">
              <p className="font-semibold text-gray-800 line-clamp-2" title={productTitle}>{productTitle}</p>
              <Line k="EAN" v={productEan} />
              <Line k="ASIN / SKU" v={productAsin} />
              <Line k="Qty" v={productQty} />
              <Line k="Bol Price" v={bolPriceDisplay} />
              <Line k="Amazon" v={amazonPriceDisplay} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-900 mb-2 border-b border-gray-200/60 pb-1">Ship To Customer</p>
            <div className="text-xs space-y-1.5">
              <Line k="Name" v={recipientName} />
              <Line k="Email" v={recipientEmail} />
              <Line k="Address" v={recipientAddress} />
              <Line k="Postal" v={recipientPostal} />
              <Line k="City" v={recipientCity} />
              <Line k="Country" v={recipientCountry} />
            </div>
          </div>
        </div>

        {/* Live Carrier Tracking Bar */}
        {(trackingBarcode || trackingUrl || downloadUrl || order.amazon_order_id) && (
          <div className="bg-white rounded-xl p-3 border border-gray-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <FiExternalLink className="text-brand" /> Carrier &amp; Fulfillment Info
              </span>
              {transporterCode && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  {transporterCode}
                </span>
              )}
            </div>

            {order.amazon_order_id && <Line k="Amazon Order #" v={order.amazon_order_id} />}
            {trackingBarcode && <Line k="Tracking Code" v={trackingBarcode} />}

            {(trackingUrl || downloadUrl) && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    Open Live Carrier Tracking <FiExternalLink size={12} />
                  </a>
                )}
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    Download Label PDF
                  </a>
                )}
              </div>
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
