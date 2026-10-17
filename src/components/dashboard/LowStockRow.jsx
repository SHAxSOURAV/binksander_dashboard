import { useState } from "react";
import { Popconfirm, Tooltip } from "antd";
import { FiBox, FiExternalLink, FiX, FiCheck } from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import CopyField from "../shared/CopyField";

/**
 * One stock alert row. Shared by the dashboard card and the full Stock Alerts page.
 */
const LowStockRow = ({ record, onResync, onDismiss, resyncing }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const country = (record.country || "NL").toLowerCase();
  const amazonUrl = `https://www.amazon.${country}/dp/${record.asin}`;
  const isOut = record.is_in_stock === false || record.stock_status === "OUT_OF_STOCK" || Number(record.stock ?? record.stock_quantity ?? 0) === 0;

  return (
    <div className="flex items-center gap-3 py-2.5">
      {record.image ? (
        <img
          src={record.image}
          alt={record.asin}
          className="w-10 h-10 object-contain rounded-md border border-gray-200 bg-white shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
          <FiBox size={18} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        {record.brand && (
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            {record.brand}
          </span>
        )}
        <a
          href={amazonUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-gray-900 text-xs hover:text-blue-600 line-clamp-1 flex items-center gap-1"
        >
          {record.product_title || `ASIN ${record.asin}`}
          <FiExternalLink size={11} className="text-gray-400 shrink-0" />
        </a>
        <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
          <CopyField label="EAN" value={record.ean} />
          <CopyField label="ASIN" value={record.asin} />
          <span className="text-[9px] font-semibold px-1.5 rounded bg-gray-100 text-gray-600 border border-gray-200 uppercase">
            {record.country || "NL"}
          </span>
        </div>
      </div>

      <span className="font-semibold text-gray-700 text-xs w-14 text-right shrink-0">
        {record.price
          ? String(record.price).startsWith("€")
            ? record.price
            : `€${record.price}`
          : "—"}
      </span>

      <Tooltip title={isOut ? "Out of stock on Amazon (Needs Review)" : "In stock on Amazon (Inventory Catalog)"}>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border shrink-0 text-[11px] font-semibold ${
            isOut
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {isOut ? <FiX size={13} /> : <FiCheck size={13} />}
          {isOut ? "Out of stock" : "In stock"}
        </span>
      </Tooltip>

      <div className="flex items-center gap-1 shrink-0">
        <Tooltip title="Resync stock">
          <button
            onClick={() => onResync(record.asin, record.country)}
            disabled={resyncing}
            aria-label="Resync stock"
            className="w-7 h-7 rounded-md bg-gray-900 hover:bg-gray-700 text-white flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <LuRefreshCw size={12} className={resyncing ? "animate-spin" : ""} />
          </button>
        </Tooltip>
        {/* Popconfirm must wrap the <button> directly: it clones its child to inject
            onClick, and a <Tooltip> in between swallows that handler instead of passing
            it down, which silently disables the confirmation. The Tooltip therefore sits
            outside on a plain <span>, and its title is blanked while the confirm is open
            so the two floating layers never stack on top of each other. */}
        <Tooltip title={confirmOpen ? "" : "Dismiss alert"}>
          <span className="inline-flex">
            <Popconfirm
              title="Dismiss this alert?"
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              onConfirm={() => {
                setConfirmOpen(false);
                onDismiss(record.asin);
              }}
              okText="Yes"
              cancelText="No"
            >
              <button
                aria-label="Dismiss alert"
                className="w-7 h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
              >
                <FiX size={14} />
              </button>
            </Popconfirm>
          </span>
        </Tooltip>
      </div>
    </div>
  );
};

export default LowStockRow;
