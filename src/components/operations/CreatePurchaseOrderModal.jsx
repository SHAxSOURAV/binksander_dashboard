import React, { useState, useEffect } from "react";
import { Modal, Input, InputNumber, DatePicker, message } from "antd";
import { FiPackage, FiTruck, FiCalendar, FiUser, FiHash, FiExternalLink, FiCheckCircle } from "react-icons/fi";
import dayjs from "dayjs";
import { useCreatePurchaseOrderMutation } from "../../Redux/rimcoApis";

const CreatePurchaseOrderModal = ({ open, onClose, order, onComplete }) => {
  const [createPO, { isLoading }] = useCreatePurchaseOrderMutation();

  const [refNumber, setRefNumber] = useState("");
  const [supplierName, setSupplierName] = useState("Amazon NL");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [expectedDate, setExpectedDate] = useState(dayjs().add(4, "day"));
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (order) {
      const defaultRef = `PO-AMZ-${order.asin || order.bol_order_id || Date.now().toString().slice(-6)}`;
      setRefNumber(defaultRef);
      setSupplierName("Amazon NL");
      setTrackingNumber("");
      setExpectedDate(dayjs().add(4, "day"));
      setQuantity(order.quantity || 1);
    }
  }, [order]);

  if (!order) return null;

  const handleSubmit = async () => {
    if (!refNumber.trim()) {
      message.error("Reference number is required.");
      return;
    }

    const payload = {
      reference_number: refNumber.trim(),
      supplier_name: supplierName.trim() || "Amazon NL",
      tracking_number: trackingNumber.trim(),
      expected_delivery_date: expectedDate ? expectedDate.format("YYYY-MM-DD") : "",
      bol_order_id: order.bol_order_id || "",
      items: [
        {
          sku: order.asin || order.sku || "N/A",
          ean: order.ean || order.spreadsheet_ean || "N/A",
          title: order.title || order.product_title || "Amazon Product",
          quantity_expected: Number(quantity) || 1,
        },
      ],
    };

    try {
      await createPO(payload).unwrap();
      message.success("Purchase order successfully sent to Rimco Logistics!");
      if (onComplete) onComplete(order.id);
      onClose();
    } catch (err) {
      message.error(err?.data?.detail || "Failed to submit Purchase Order to Rimco");
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      centered
      className="font-poppins custom-po-modal"
    >
      <div className="p-2 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
              <FiPackage />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Send Inbound PO to Rimco</h2>
              <p className="text-xs text-gray-500">
                Register this Amazon order for Rimco Logistics warehouse receiving
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Post-Purchase Inbound
          </span>
        </div>

        {/* Live Product Card */}
        <div className="bg-[#f9fafb] rounded-xl p-3.5 border border-gray-100/80 flex items-start gap-3">
          {order.photo || order.product_photo ? (
            <img
              src={order.photo || order.product_photo}
              alt={order.title}
              className="w-14 h-14 object-contain rounded-lg bg-white p-1 border border-gray-100"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-bold">
              AMZ
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-gray-900 truncate" title={order.title}>
              {order.title || "Amazon Product"}
            </h4>
            <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-gray-500">
              <span>ASIN: <strong>{order.asin || "—"}</strong></span>
              <span>EAN: <strong>{order.ean || "—"}</strong></span>
              {order.bol_order_id && (
                <span className="text-brand font-bold">Bol Order: {order.bol_order_id}</span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Reference Number */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FiHash className="text-brand" /> Reference Number *
            </label>
            <Input
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="e.g. PO-AMZ-987654"
              className="h-10 rounded-lg text-xs"
            />
          </div>

          {/* Supplier Name */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FiUser className="text-brand" /> Supplier Name
            </label>
            <Input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Amazon NL"
              className="h-10 rounded-lg text-xs"
            />
          </div>

          {/* Tracking Number */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FiTruck className="text-brand" /> Tracking Number (Optional)
            </label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 35892104921"
              className="h-10 rounded-lg text-xs"
            />
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FiCalendar className="text-brand" /> Expected Delivery Date
            </label>
            <DatePicker
              value={expectedDate}
              onChange={(date) => setExpectedDate(date)}
              format="YYYY-MM-DD"
              className="h-10 w-full rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Items Summary Table */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 border-b border-gray-100 flex justify-between items-center">
            <span>Inbound Item Details</span>
            <span className="text-[11px] font-normal text-gray-400">1 Item configured</span>
          </div>
          <div className="p-3 text-xs flex justify-between items-center bg-white">
            <div className="max-w-[340px]">
              <p className="font-semibold text-gray-800 truncate">{order.title || "Amazon Item"}</p>
              <p className="text-[10px] text-gray-400 font-mono">SKU: {order.asin || "N/A"} | EAN: {order.ean || "N/A"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Qty:</span>
              <InputNumber
                min={1}
                max={999}
                value={quantity}
                onChange={(val) => setQuantity(val)}
                className="w-20 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-5 py-2.5 text-xs font-semibold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FiCheckCircle size={14} />
            {isLoading ? "Submitting to Rimco..." : "Submit PO to Rimco Logistics"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreatePurchaseOrderModal;
