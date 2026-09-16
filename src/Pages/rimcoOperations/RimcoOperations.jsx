import { useState, useEffect } from "react";
import { Input, Spin, Empty, Button, Select } from "antd";
import {
  FiSearch,
  FiPackage,
  FiTruck,
  FiExternalLink,
  FiDownload,
  FiRefreshCw,
  FiBox,
  FiLayers,
  FiCornerDownLeft,
  FiHelpCircle,
  FiServer,
  FiAlertCircle,
} from "react-icons/fi";
import RimcoOrderDetailModal from "../../components/operations/RimcoOrderDetailModal";
import CreateOrderModal from "../../components/operations/CreateOrderModal";
import Pagination from "../../components/shared/Pagination";
import { useUI } from "../../Provider/ContextProvider";
import {
  useGetRimcoCredentialsQuery,
  useGetLiveRimcoOrdersQuery,
  useGetLiveRimcoShipmentsQuery,
  useGetLiveRimcoProductsQuery,
  useGetLiveRimcoTicketsQuery,
  useGetPurchaseOrdersQuery,
} from "../../Redux/rimcoApis";

// Status meta mapping to match Rimco WMS UI style
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

const RimcoOperations = () => {
  const { openSettings, setSettingsTab, activeRimcoAccountId, setActiveRimcoAccountId } = useUI();

  const [activeNav, setActiveNav] = useState("orders"); // "orders" | "shipments" | "entry" | "products" | "returns" | "tickets"
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Accounts list query
  const { data: rimcoAccounts = [], isLoading: accountsLoading } = useGetRimcoCredentialsQuery();

  // Ensure active account is selected
  useEffect(() => {
    if (rimcoAccounts.length > 0) {
      const match = rimcoAccounts.find((a) => a.account_id === activeRimcoAccountId);
      if (!activeRimcoAccountId || !match) {
        setActiveRimcoAccountId(rimcoAccounts[0].account_id);
      }
    }
  }, [rimcoAccounts, activeRimcoAccountId, setActiveRimcoAccountId]);

  const hasNoAccounts = !accountsLoading && rimcoAccounts.length === 0;

  // Live Rimco API Queries scoped to activeRimcoAccountId
  const {
    data: ordersData,
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    refetch: refetchOrders,
  } = useGetLiveRimcoOrdersQuery(
    {
      accountId: activeRimcoAccountId || undefined,
      page,
      limit,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search || undefined,
    },
    { skip: hasNoAccounts || !activeRimcoAccountId }
  );

  const {
    data: shipmentsData,
    isLoading: shipmentsLoading,
    refetch: refetchShipments,
  } = useGetLiveRimcoShipmentsQuery(
    {
      accountId: activeRimcoAccountId || undefined,
      page,
      limit,
      search: search || undefined,
    },
    { skip: hasNoAccounts || !activeRimcoAccountId }
  );

  const {
    data: productsData,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useGetLiveRimcoProductsQuery(
    {
      accountId: activeRimcoAccountId || undefined,
      page,
      limit,
      search: search || undefined,
    },
    { skip: hasNoAccounts || !activeRimcoAccountId }
  );

  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    refetch: refetchTickets,
  } = useGetLiveRimcoTicketsQuery(
    {
      accountId: activeRimcoAccountId || undefined,
      page,
      limit,
      search: search || undefined,
    },
    { skip: hasNoAccounts || !activeRimcoAccountId }
  );

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
  const shipmentsList = [...rawShipments].sort(
    (a, b) => new Date(b.shipped_at || b.created_at || 0) - new Date(a.shipped_at || a.created_at || 0)
  );
  const totalShipments = shipmentsData?.total || 0;

  const productsList = productsData?.products || [];
  const totalProducts = productsData?.total || 0;

  const ticketsList = ticketsData?.tickets || [];
  const totalTickets = ticketsData?.total || 0;

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900">Rimco Logistics</h1>
              {activeRimcoAccountId && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  Live WMS
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Live Warehouse Management &amp; Direct Fulfillment Portal
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Account Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
              <FiServer size={14} className="text-gray-400" />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:inline">
                Account:
              </span>
              <Select
                value={activeRimcoAccountId || undefined}
                onChange={(val) => {
                  setActiveRimcoAccountId(val);
                  setPage(1);
                }}
                loading={accountsLoading}
                placeholder={rimcoAccounts.length === 0 ? "No accounts added" : "Select Rimco Account"}
                className="w-44 text-xs font-semibold"
                bordered={false}
                disabled={rimcoAccounts.length === 0}
                options={rimcoAccounts.map((acc) => ({
                  value: acc.account_id,
                  label: (
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-gray-800 truncate">{acc.account_name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    </span>
                  ),
                }))}
              />
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("connections");
                  openSettings();
                }}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 ml-1 underline cursor-pointer"
                title="Manage accounts in Connection settings"
              >
                Manage
              </button>
            </div>

            {/* Search Input */}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<FiSearch className="text-gray-400 mr-1" />}
              placeholder="Search reference, barcode, customer..."
              className="h-10 rounded-xl w-full sm:w-72 text-xs bg-white border-gray-200"
            />

            {/* Sync Live Button */}
            <Button
              icon={<FiRefreshCw className={ordersFetching ? "animate-spin" : ""} />}
              onClick={() => {
                refetchOrders();
                refetchShipments();
                refetchProducts();
                refetchTickets();
              }}
              className="h-10 rounded-xl flex items-center justify-center text-xs bg-gray-900 text-white hover:bg-black border-none"
            >
              Sync Live
            </Button>
          </div>
        </div>

        {/* Missing Credentials Notice if none saved */}
        {rimcoAccounts.length === 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-900 text-xs px-4 py-3 rounded-xl">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="text-blue-600 shrink-0" size={16} />
              <span>
                Want to connect your own Rimco Logistics account? You can add multiple Rimco accounts with your Bearer tokens.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettingsTab("connections");
                openSettings();
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shrink-0 ml-2"
            >
              Add Rimco Account
            </button>
          </div>
        )}

        {hasNoAccounts ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center max-w-lg mx-auto space-y-4 my-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
              <FiServer size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900">No Rimco Account Connected</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              You haven&apos;t connected any Rimco Logistics (Lyra WMS) accounts yet. Add your account credentials in Connection Settings to view live warehouse orders, shipments, products, and support tickets.
            </p>
            <button
              type="button"
              onClick={() => {
                setSettingsTab("connections");
                openSettings();
              }}
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Connect Rimco Account
            </button>
          </div>
        ) : (
          <>
            {/* Navigation Sub-Tabs Bar */}
            <div className="bg-white rounded-2xl p-2 border border-gray-100/80 shadow-sm flex items-center gap-2 overflow-x-auto">
              {[
                { key: "orders", label: "Orders", icon: FiBox, count: totalOrders },
                { key: "shipments", label: "Shipments", icon: FiTruck, count: totalShipments },
                { key: "entry", label: "Entry (Inbound POs)", icon: FiPackage, count: inboundPOList.length },
                { key: "products", label: "Products", icon: FiLayers, count: totalProducts },
                { key: "returns", label: "Returns", icon: FiCornerDownLeft, count: returnsList.length },
                { key: "tickets", label: "Tickets", icon: FiHelpCircle, count: totalTickets },
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
                  <table className="w-full min-w-[1000px] text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 bg-[#f9fafc] border-y border-gray-100 [&>th]:font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">REFERENCE</th>
                        <th className="py-3 px-3">STATUS</th>
                        <th className="py-3 px-3">REFERENCE ON SALESCHANNEL</th>
                        <th className="py-3 px-3 text-center">ITEMS</th>
                        <th className="py-3 px-3">TOTAL</th>
                        <th className="py-3 px-3">CREATED AT</th>
                        <th className="py-3 px-3">CUSTOMER</th>
                        <th className="py-3 px-3">TRANSPORTER CODE</th>
                        <th className="py-3 px-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ordersList.map((o) => {
                        const itemsCount = o.line_items?.reduce(
                          (acc, it) => acc + (it.amount || it.quantity || 1),
                          0
                        ) || o.line_items?.length || 1;

                        return (
                          <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 px-3 font-mono font-bold text-gray-900">
                              <div className="flex items-center gap-1.5">
                                <span>{o.reference || `ORD-${o.id}`}</span>
                                {o.is_urgent === 1 && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-700">
                                    URGENT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              {renderStatusTag(o.status)}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-gray-700">
                              {o.saleschannel_foreign_order_reference || o.saleschannel_foreign_order_id || "—"}
                            </td>
                            <td className="py-3.5 px-3 text-center font-semibold text-gray-800">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono text-[11px]">
                                {itemsCount}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-semibold text-gray-900">
                              {o.paid_total != null ? `€${o.paid_total}` : "—"}
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
                        );
                      })}
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
          {/* NAV 4: PRODUCTS VIEW (Exposing Real API Stock & Location Data) */}
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
                  <table className="w-full min-w-[1000px] text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 bg-[#f9fafc] border-y border-gray-100 [&>th]:font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">SKU</th>
                        <th className="py-3 px-3">PRODUCT NAME</th>
                        <th className="py-3 px-3">BARCODE</th>
                        <th className="py-3 px-3">PRICE</th>
                        <th className="py-3 px-3">IN STOCK</th>
                        <th className="py-3 px-3">WAREHOUSE &amp; LOCATION</th>
                        <th className="py-3 px-3">WEIGHT / SIZE</th>
                        <th className="py-3 px-3">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {productsList.map((p) => {
                        const locations = p.product_locations || [];
                        const primaryLoc = locations[0] || {};
                        const locInfo = primaryLoc.location || {};
                        const warehouse = locInfo.warehouse || {};

                        // Calculate total stock and reserved stock from API locations
                        const totalStock = locations.reduce(
                          (acc, loc) => acc + (Number(loc.stock) || 0),
                          0
                        );
                        const totalReserved = locations.reduce(
                          (acc, loc) => acc + (Number(loc.reserved_stock) || 0),
                          0
                        );
                        const freeStock = Math.max(0, totalStock - totalReserved);

                        return (
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
                              {locations.length > 0 ? (
                                <div className="space-y-0.5">
                                  <p className="font-bold text-gray-900 font-mono">
                                    {totalStock.toLocaleString()} in stock
                                  </p>
                                  {totalReserved > 0 && (
                                    <p className="text-[10px] text-gray-400 font-mono">
                                      {totalReserved} reserved · {freeStock} free
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 font-mono">0</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3">
                              {warehouse.name || locInfo.name ? (
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-gray-800">
                                    {warehouse.name || "Warehouse"}
                                  </p>
                                  <p className="text-[10px] text-gray-500 font-mono">
                                    Loc: {locInfo.name || primaryLoc.location_id || "—"}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-gray-600 font-mono text-[11px]">
                              {p.weight ? `${p.weight}g` : "—"}
                              {p.length && p.width && p.height && (
                                <span className="text-gray-400 text-[10px] block">
                                  {p.length}×{p.width}×{p.height}mm
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3">
                              <span
                                className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                                  p.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {p.status || "Active"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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

          {/* ------------------------------------------------------------- */}
          {/* NAV 6: WAREHOUSE TICKETS VIEW (Live from GET /tickets) */}
          {/* ------------------------------------------------------------- */}
          {activeNav === "tickets" && (
            <>
              {ticketsLoading ? (
                <div className="py-24 flex justify-center">
                  <Spin tip="Loading warehouse support tickets..." />
                </div>
              ) : ticketsList.length === 0 ? (
                <div className="py-16">
                  <Empty description="No support tickets found in this Rimco account." />
                </div>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full min-w-[900px] text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 bg-[#f9fafc] border-y border-gray-100 [&>th]:font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">TICKET TITLE</th>
                        <th className="py-3 px-3">STATUS</th>
                        <th className="py-3 px-3">ASSIGNEE</th>
                        <th className="py-3 px-3">RESOLUTION</th>
                        <th className="py-3 px-3">DATE CREATED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ticketsList.map((t, idx) => (
                        <tr key={t.uuid || idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-3 font-semibold text-gray-900">
                            {t.title || "Ticket"}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                                t.status === "open"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : t.status === "resolved" || t.status === "closed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {t.status || "Open"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-gray-700 font-medium">
                            {t.assignee?.name || t.assignee?.email || "Unassigned"}
                          </td>
                          <td className="py-3.5 px-3 text-gray-500">
                            {t.resolution || "—"}
                          </td>
                          <td className="py-3.5 px-3 text-gray-500 font-mono">
                            {(t.created_at || "").slice(0, 16).replace("T", " ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalTickets > 0 && (
                <Pagination
                  current={page}
                  total={Math.ceil(totalTickets / limit)}
                  pageSize={limit}
                  totalItems={totalTickets}
                  onChange={setPage}
                  onPageSizeChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                />
              )}
            </>
          )}
        </div>
      </>
    )}
  </div>

      {/* Dedicated Rimco Order Detail Modal */}
      <RimcoOrderDetailModal
        open={!!selectedOrder}
        order={selectedOrder}
        accountId={activeRimcoAccountId}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={() => {
          refetchOrders();
          refetchShipments();
        }}
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
