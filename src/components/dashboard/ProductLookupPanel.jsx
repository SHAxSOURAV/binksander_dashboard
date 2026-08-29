import { Link } from "react-router-dom";
import {
  FiBox,
  FiArchive,
  FiAlertTriangle,
  FiTag,
  FiShoppingBag,
  FiX,
  FiExternalLink,
} from "react-icons/fi";
import CopyField from "../shared/CopyField";

const money = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? `€${n.toFixed(2)}` : String(v);
};

const date = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

/** One label/value pair inside a source section. */
const Field = ({ label, value, tone }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
      {label}
    </p>
    <p
      className={`text-xs font-semibold mt-0.5 truncate ${
        tone === "danger"
          ? "text-red-600"
          : tone === "success"
            ? "text-green-700"
            : "text-gray-800"
      }`}
    >
      {value ?? "—"}
    </p>
  </div>
);

/** A single source block. Rendered only when that source has the product. */
const Section = ({ icon, title, to, children }) => (
  <div className="border border-gray-100 rounded-lg p-3.5 bg-gray-50/60">
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-1.5 text-gray-700">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      {to && (
        <Link
          to={to}
          className="text-[10px] font-semibold text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors"
        >
          Open <FiExternalLink size={10} />
        </Link>
      )}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{children}</div>
  </div>
);

const ProductLookupPanel = ({ result, isFetching, error, onClear }) => {
  if (isFetching) {
    return (
      <div className="bg-white rounded-lg p-5 card-shadow animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-16 bg-gray-100 rounded" />
        <div className="h-16 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-5 card-shadow flex items-center justify-between">
        <p className="text-xs text-red-600 font-medium">
          {error?.data?.detail || "Lookup failed. Check the EAN and try again."}
        </p>
        <button onClick={onClear} className="text-gray-400 hover:text-gray-700">
          <FiX size={16} />
        </button>
      </div>
    );
  }

  if (!result) return null;

  const { sources = {} } = result;
  const { catalog, review, offer, orders } = sources;

  return (
    <div className="bg-white rounded-lg card-shadow overflow-hidden">
      {/* Identity header */}
      <div className="flex items-start gap-3 p-4 border-b border-gray-100">
        {result.image ? (
          <img
            src={result.image}
            alt={result.title}
            className="w-12 h-12 object-contain rounded-md border border-gray-200 bg-white shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
            <FiBox size={20} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {result.brand && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {result.brand}
            </span>
          )}
          <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
            {result.title}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <CopyField label="EAN" value={result.ean} />
            <CopyField label="ASIN" value={result.asin} />
          </div>
        </div>

        <button
          onClick={onClear}
          className="p-1 rounded-md text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Clear search result"
        >
          <FiX size={16} />
        </button>
      </div>

      {!result.found ? (
        <div className="p-6 text-center">
          <p className="text-xs text-gray-500">
            Nothing found for{" "}
            <span className="font-mono font-semibold text-gray-700">{result.query}</span>{" "}
            in your catalog, offers, or orders.
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {catalog && (
            <Section
              icon={<FiArchive size={13} />}
              title="Inventory Catalog"
              to="/products"
            >
              <Field label="Purchase Price" value={money(catalog.purchase_price)} />
              <Field
                label="Supplier Stock"
                value={catalog.supplier_stock ?? 0}
                tone={Number(catalog.supplier_stock ?? 0) <= 3 ? "danger" : undefined}
              />
              <Field label="Country" value={catalog.country} />
              <Field label="Validation" value={catalog.validation_status || "—"} />
            </Section>
          )}

          {review && (
            <Section
              icon={<FiAlertTriangle size={13} className="text-amber-500" />}
              title="Needs Review"
              to="/needs-review"
            >
              <div className="col-span-2 sm:col-span-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                  Reasons
                </p>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  {review.reasons?.length
                    ? review.reasons.join(" · ")
                    : "Flagged for manual review"}
                </p>
              </div>
            </Section>
          )}

          {offer && (
            <Section icon={<FiTag size={13} />} title="Bol.com Offer" to="/bol-listings">
              <Field label="Price" value={money(offer.price)} />
              <Field
                label="Stock"
                value={offer.stock ?? 0}
                tone={Number(offer.stock ?? 0) === 0 ? "danger" : undefined}
              />
              <Field
                label="Status"
                value={offer.for_sale ? "For sale" : offer.on_hold ? "On hold" : "Not for sale"}
                tone={offer.for_sale ? "success" : "danger"}
              />
              <Field label="Fulfilment" value={offer.fulfilment || offer.condition || "—"} />
            </Section>
          )}

          {orders && (
            <Section
              icon={<FiShoppingBag size={13} />}
              title="Sales & Orders"
              to="/orders"
            >
              <Field label="Orders" value={orders.order_count} />
              <Field label="Units Sold" value={orders.units_sold} />
              <Field label="Revenue" value={money(orders.revenue)} tone="success" />
              <Field label="Last Order" value={date(orders.last_ordered)} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductLookupPanel;
