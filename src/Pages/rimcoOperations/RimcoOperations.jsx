import { useState } from "react";
import { Input, Spin, Empty, Button } from "antd";
import {
  FiSearch,
  FiPackage,
  FiTruck,
  FiExternalLink,
  FiDownload,
  FiRefreshCw,
  FiBox,
  FiLayers,
  FiCornerDownLeft
} from "react-icons/fi";
import FulfillmentDetailModal from "../../components/operations/FulfillmentDetailModal";
import CreateOrderModal from "../../components/operations/CreateOrderModal";
import Pagination from "../../components/shared/Pagination";
import {
  useGetLiveRimcoOrdersQuery,
  useGetLiveRimcoShipmentsQuery,
  useGetLiveRimcoProductsQuery,
  useGetPurchaseOrdersQuery,
} from "../../Redux/rimcoApis";

// Status meta mapping to match Rimco WMS UI style
const STATUS_PILLS = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing", bg: "#FEE2E2", text: "#DC2626" },
  { key: "ready_to_ship", label: "Ready to ship", bg: "#FEF3C7", text: "#D97706" },
  { key: "shipped", label: "Shipped", bg: "#D1FAE5", text: "#059669" },
  { key: "backorder", label: "Backorder", bg: "#F3F4F6", text: "#4B5563" },
  { key: "fulfillable_backorders", label: "Fulfillable backorders", bg: "#E0E7FF", text: "#4338CA" },
  { key: "snoozed", label: "Snoozed", bg: "#F5F3FF", text: "#6D28D9" },
  { key: "created", label: "Created", bg: "#FCE7F3", text: "#DB2777" },
  { key: "address_validation_error", label: "Address Validation Error", bg: "#FFE4E6", text: "#E11D48" },
  { key: "deleted", label: "Deleted", bg: "#F3F4F6", text: "#9CA3AF" }
];

const RimcoOperations = () => {
  const [activeNav, setActiveNav] = useState("orders"); // "orders" | "shipments" | "entry" | "products" | "returns"
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Live Rimco API Queries (NO mock or hardcoded data)
  const {
    data: ordersData,
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    refetch: refetchOrders,
  } = useGetLiveRimcoOrdersQuery({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });

  const {
    data: shipmentsData,
    isLoading: shipmentsLoading,
    refetch: refetchShipments,
  } = useGetLiveRimcoShipmentsQuery({
    page,
    limit,
    search: search || undefined,
  });

  const {
    data: productsData,
    isLoading: productsLoading,
  } = useGetLiveRimcoProductsQuery({
    page,
    limit,
    search: search || undefined,
  });

  const { data: poData } = useGetPurchaseOrdersQuery();
  const rawPOList = poData?.data || [];
  const inboundPOList = [...rawPOList].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );

  const STATUS_PRIORITY = {
    processing: 0,
    ready_to_ship: 1,
    created: 2,
    address_validation_error: 3,
    backorder: 4,
    snoozed: 5,
    completed: 6,
    shipped: 6,
    deleted: 7
  };

  const rawOrders = ordersData?.orders || [];
  const ordersList = [...rawOrders].sort((a, b) => {
    if (statusFilter === "all") {
      const pA = STATUS_PRIORITY[(a.status || "").toLowerCase()] ?? 99;
      const pB = STATUS_PRIORITY[(b.status || "").toLowerCase()] ?? 99;
      if (pA !== pB) return pA - pB;
    }
    return new Date(b.created_at || b.ordered_at || 0) - new Date(a.created_at || a.ordered_at || 0);
  });
  const totalOrders = ordersData?.total || 0;
  const lastPageOrders = ordersData?.last_page || 1;

  const rawShipments = shipmentsData?.shipments || [];
  // Latest shipped at first (newest shipped descending)
  const shipmentsList = [...rawShipments].sort(
    (a, b) => new Date(b.shipped_at || b.created_at || 0) - new Date(a.shipped_at || a.created_at || 0)
  );
  const totalShipments = shipmentsData?.total || 0;

  const productsList = productsData?.products || [];
  const totalProducts = productsData?.total || 0;

  // Live Returns filter from live orders
  const returnsList = ordersList.filter(o => o.return_order_id || o.status === "returned" || o.status === "return_requested");

  const renderStatusTag = (statusStr) => {
    const st = (statusStr || "created").toLowerCase();
    const match = STATUS_PILLS.find((p) => p.key === st);

    if (st === "completed" || st === "shipped") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-900 text-emerald-100 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Shipped
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

  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7f8] font-poppins p-4 sm:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rimco Logistics</h1>
            <p className="text-xs text-gray-500 mt-1">
              Live Warehouse Management &amp; Direct Fulfillment Portal
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<FiSearch className="text-gray-400 mr-1" />}
              placeholder="Search reference, barcode, customer..."
              className="h-10 rounded-xl w-full sm:w-80 text-xs bg-white border-gray-200"
            />
            <Button
              icon={<FiRefreshCw className={ordersFetching ? "animate-spin" : ""} />}
              onClick={() => {
                refetchOrders();
                refetchShipments();
              }}
              className="h-10 rounded-xl flex items-center justify-center text-xs bg-gray-900 text-white hover:bg-black border-none"
            >
              Sync Live
            </Button>
          </div>
        </div>

        {/* Navigation Sub-Tabs Bar (Black & White Theme) */}
        <div className="bg-white rounded-2xl p-2 border border-gray-100/80 shadow-sm flex items-center gap-2 overflow-x-auto">
          {[
            { key: "orders", label: "Orders", icon: FiBox, count: totalOrders },
            { key: "shipments", label: "Shipments", icon: FiTruck, count: totalShipments },
            { key: "entry", label: "Entry (Inbound POs)", icon: FiPackage, count: inboundPOList.length },
            { key: "products", label: "Products", icon: FiLayers, count: totalProducts },
            { key: "returns", label: "Returns", icon: FiCornerDownLeft, count: returnsList.length },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveNav(item.key);
                  setPage(1);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
                {item.count > 0 && (
                  <span
                    className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm space-y-5">
          {/* ------------------------------------------------------------- */}
          {/* NAV 1: ORDERS VIEW */}
          {/* ------------------------------------------------------------- */}
          {activeNav === "orders" && (
            <>
              {/* Status Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100 text-xs">
                {STATUS_PILLS.map((pill) => {
                  const isActive = statusFilter === pill.key;
                  return (
                    <button
                      key={pill.key}
                      onClick={() => {
                        setStatusFilter(pill.key);
                        setPage(1);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer text-xs ${
                        isActive
                          ? "bg-gray-900 text-white shadow-sm font-bold"
                          : "bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              {/* Orders Table */}
              {ordersLoading || ordersFetching ? (
                <div className="py-24 flex justify-center">
                  <Spin tip="Fetching live Rimco WMS orders..." />
                </div>
              ) : ordersList.length === 0 ? (
                <div className="py-16">
                  <Empty description="No live orders found matching view." />
                </div>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full min-w-[950px] text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 bg-[#f9fafc] border-y border-gray-100 [&>th]:font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">REFERENCE</th>
                        <th className="py-3 px-3">STATUS</th>
                        <th className="py-3 px-3">REFERENCE ON SALESCHANNEL</th>
                        <th className="py-3 px-3">CREATED AT</th>
                        <th className="py-3 px-3">CUSTOMER</th>
                        <th className="py-3 px-3">TRANSPORTER CODE</th>
                        <th className="py-3 px-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ordersList.map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-gray-900">
                            {o.reference || `ORD-${o.id}`}
                          </td>
                          <td className="py-3.5 px-3">
                            {renderStatusTag(o.status)}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-gray-700">
                            {o.saleschannel_foreign_order_reference || o.saleschannel_foreign_order_id || "—"}
                          </td>
                          <td className="py-3.5 px-3 text-gray-500 font-mono">
                            {(o.created_at || o.ordered_at || "").slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-semibold text-gray-800">
                              {o.customer?.name || o.shipping_address?.fullname || "Customer"}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[160px]">
                              {o.shipping_address?.city ? `${o.shipping_address.city}, ${o.shipping_address.country || "NL"}` : "—"}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-semibold text-gray-700">
                            {o.vvb_transporter_code || (o.shipments?.[0]?.barcode) || "—"}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(o)}
                              className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalOrders > 0 && (
                <Pagination
                  current={page}
                  total={lastPageOrders}
                  pageSize={limit}
                  totalItems={totalOrders}
                  onChange={setPage}
                  onPageSizeChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                />
              )}
            </>
          )}

          {/* ------------------------------------------------------------- */}
          {/* NAV 2: SHIPMENTS VIEW */}
          {/* ------------------------------------------------------------- */}
          {activeNav === "shipments" && (
            <>
              {shipmentsLoading ? (
                <div className="py-24 flex justify-center">
                  <Spin tip="Loading live shipments with carrier tracking codes..." />
                </div>
              ) : shipmentsList.length === 0 ? (
                <div className="py-16">
                  <Empty description="No live shipments found matching search." />
                </div>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full min-w-[950px] text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 bg-[#f9fafc] border-y border-gray-100 [&>th]:font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">ORDER REFERENCE</th>
                        <th className="py-3 px-3">CARRIER</th>
                        <th className="py-3 px-3">TRACKING BARCODE</th>
                        <th className="py-3 px-3">RECIPIENT / DESTINATION</th>
                        <th className="py-3 px-3">SHIPPED AT</th>
                        <th className="py-3 px-3 text-right">LABEL / TRACKING</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {shipmentsList.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-3">
                            <p className="font-mono font-bold text-gray-900">{s.order_reference || "N/A"}</p>
                            {s.foreign_reference && (
                              <span className="text-[10px] text-gray-500 font-mono">{s.foreign_reference}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-gray-800">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                              <FiTruck size={12} /> {s.carrier_name}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-gray-800">
                            {s.barcode || "—"}
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-semibold text-gray-800">{s.customer_name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{s.destination}</p>
                          </td>
                          <td className="py-3.5 px-3 text-gray-500 font-mono">
                            {(s.shipped_at || "").slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {s.tracking_url && (
                                <a
                                  href={s.tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold transition flex items-center gap-1 text-xs"
                                >
                                  Track Carrier <FiExternalLink size={12} />
                                </a>
                              )}
                              {s.download_url && (
                                <a
                                  href={s.download_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 transition flex items-center gap-1 text-xs"
                                  title="Download Shipping Label PDF"
                                >
                                  <FiDownload size={12} /> Label
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalShipments > 0 && (
                <Pagination
                  current={page}
                  total={Math.ceil(totalShipments / limit)}
                  pageSize={limit}
                  totalItems={totalShipments}
                  onChange={setPage}
                  onPageSizeChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                />
              )}
            </>
          )}

          {/* ------------------------------------------------------------- */}
          {/* NAV 3: ENTRY (Inbound POs from Amazon NL) */}
          {/* ------------------------------------------------------------- */}
          {activeNav === "entry" && (
            <>
              {inboundPOList.length === 0 ? (
                <div className="py-16">
                  <Empty description="No inbound entries registered yet. Use 'Buy Now' on Amazon Sourcing to send POs to Rimco." />
                </div>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full min-w-[900px] text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 bg-[#f9fafc] border-y border-gray-100 [&>th]:font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">PO REFERENCE</th>
                        <th className="py-3 px-3">SUPPLIER</th>
                        <th className="py-3 px-3">PRODUCT ITEM</th>
                        <th className="py-3 px-3">TRACKING NUMBER</th>
                        <th className="py-3 px-3">EXPECTED DATE</th>
                        <th className="py-3 px-3">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {inboundPOList.map((po) => {
                        const item = po.items?.[0] || {};
                        return (
                          <tr key={po._id || po.reference_number} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-3.5 px-3">
                              <p className="font-mono font-bold text-gray-900">{po.reference_number}</p>
                              {po.bol_order_id && (
                                <span className="text-[10px] text-gray-500 font-mono font-bold">Bol ID: {po.bol_order_id}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                                {po.supplier_name || "Amazon NL"}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 max-w-[260px]">
                              <p className="font-semibold text-gray-800 truncate" title={item.title}>
                                {item.title || "Amazon Item"}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mt-0.5">
                                <span>SKU: {item.sku || "—"}</span>
                                <span>EAN: {item.ean || "—"}</span>
                                <span className="text-gray-800 font-bold">Qty: {item.quantity_expected || 1}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 font-mono font-semibold text-gray-700">
                              {po.tracking_number || "Pending carrier"}
                            </td>
                            <td className="py-3.5 px-3 text-gray-600 font-mono">
                              {po.expected_delivery_date || "—"}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {po.status || "ACCEPTED_BY_RIMCO"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ------------------------------------------------------------- */}
          {/* NAV 4: PRODUCTS VIEW */}
          {/* ------------------------------------------------------------- */}
          {activeNav === "products" && (
            <>
              {productsLoading ? (
                <div className="py-24 flex justify-center">
                  <Spin tip="Loading Rimco products catalog..." />
                </div>
              ) : productsList.length === 0 ? (
                <div className="py-16">
                  <Empty description="No products found in Rimco catalog." />
                </div>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full min-w-[900px] text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 bg-[#f9fafc] border-y border-gray-100 [&>th]:font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">SKU</th>
                        <th className="py-3 px-3">PRODUCT NAME</th>
                        <th className="py-3 px-3">BARCODE</th>
                        <th className="py-3 px-3">PRICE</th>
                        <th className="py-3 px-3">STOCK STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {productsList.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-gray-900">{p.sku || "—"}</td>
                          <td className="py-3.5 px-3 font-semibold text-gray-800 max-w-[260px] truncate" title={p.name}>
                            {p.name || "—"}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-gray-600">{p.barcode || "—"}</td>
                          <td className="py-3.5 px-3 font-semibold text-gray-800">
                            {p.price ? `€${p.price}` : "—"}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active in Warehouse
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalProducts > 0 && (
                <Pagination
                  current={page}
                  total={Math.ceil(totalProducts / limit)}
                  pageSize={limit}
                  totalItems={totalProducts}
                  onChange={setPage}
                  onPageSizeChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                />
              )}
            </>
          )}

          {/* ------------------------------------------------------------- */}
          {/* NAV 5: RETURNS VIEW */}
          {/* ------------------------------------------------------------- */}
          {activeNav === "returns" && (
            <>
              {returnsList.length === 0 ? (
                <div className="py-16">
                  <Empty description="No return orders recorded in live Rimco WMS." />
                </div>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full min-w-[900px] text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 bg-[#f9fafc] border-y border-gray-100 [&>th]:font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">REFERENCE</th>
                        <th className="py-3 px-3">CUSTOMER</th>
                        <th className="py-3 px-3">RETURN STATUS</th>
                        <th className="py-3 px-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {returnsList.map((ret) => (
                        <tr key={ret.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-gray-900">
                            {ret.reference || `RET-${ret.id}`}
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-gray-800">
                            {ret.customer?.name || "Customer"}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Return Received
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(ret)}
                              className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <FulfillmentDetailModal
        open={!!selectedOrder}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        source="rimco"
      />

      {/* Create Order Modal */}
      <CreateOrderModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={refetchOrders}
      />
    </div>
  );
};

export default RimcoOperations;
