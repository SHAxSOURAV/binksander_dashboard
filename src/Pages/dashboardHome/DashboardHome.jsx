import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input, Select, Tag, Tooltip } from "antd";
import {
  FiSearch,
  FiTrendingUp,
  FiDollarSign,
  FiShoppingBag,
  FiCheckCircle,
  FiAlertCircle,
  FiAlertTriangle,
  FiHelpCircle,
  FiRotateCcw,
  FiStar,
  FiCalendar,
  FiActivity,
  FiAward,
  FiBarChart2,
  FiX,
  FiArrowRight,
} from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import toast from "react-hot-toast";
import StatsCard from "../../components/dashboard/StatsCard";
import OrdersDonut from "../../components/dashboard/OrdersDonut";
import PerformanceTab from "../../components/dashboard/PerformanceTab";
import SalesAnalysisTab from "../../components/dashboard/SalesAnalysisTab";
import ProductLookupPanel from "../../components/dashboard/ProductLookupPanel";
import LowStockRow from "../../components/dashboard/LowStockRow";
import Pagination from "../../components/shared/Pagination";

import {
  useGetDashboardQuery,
  useGetKpisQuery,
  useGetBolOrdersQuery,
  useSyncNowMutation,
  useLazyGetProductLookupQuery,
} from "../../Redux/analyticsApis";

import {
  useGetLowStockAlertsQuery,
  useDismissLowStockAlertMutation,
  useResyncStockMutation,
} from "../../Redux/productApis";

const PERIOD_OPTIONS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 14 days", value: "14d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 365 days", value: "365d" },
];

const TABS = [
  { key: "overview", label: "Overview", icon: FiActivity },
  { key: "performance", label: "Bol Performance", icon: FiAward },
  { key: "sales-analysis", label: "Sales Analysis", icon: FiBarChart2 },
];

// Fills the card down to the height of the donut + recent-orders column beside it.
const ALERTS_PAGE_SIZE = 10;

const DashboardHome = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Retain selected period filter across sessions
  const [range, setRange] = useState(() => {
    return localStorage.getItem("bol_dashboard_period") || "30d";
  });

  useEffect(() => {
    localStorage.setItem("bol_dashboard_period", range);
  }, [range]);

  // ---- product lookup (Overview search) ----
  const [lookupTerm, setLookupTerm] = useState("");
  const [runLookup, { data: lookupResult, isFetching: lookingUp, error: lookupError }] =
    useLazyGetProductLookupQuery();
  const [hasSearched, setHasSearched] = useState(false);

  const handleLookup = () => {
    const term = lookupTerm.trim();
    if (term.length < 3) {
      toast.error("Enter at least 3 characters of an EAN");
      return;
    }
    setHasSearched(true);
    runLookup(term);
  };

  const clearLookup = () => {
    setHasSearched(false);
    setLookupTerm("");
  };

  const { data: dash } = useGetDashboardQuery(range);
  const { data: kpisData } = useGetKpisQuery(range);
  const { data: ordersData } = useGetBolOrdersQuery({ page: 1, limit: 5 });
  const [syncNow, { isLoading: syncing }] = useSyncNowMutation();

  const [alertPage, setAlertPage] = useState(1);
  const { data: alertsRes, isLoading: loadingAlerts } = useGetLowStockAlertsQuery({
    page: alertPage,
    limit: ALERTS_PAGE_SIZE,
  });
  const [dismissAlert] = useDismissLowStockAlertMutation();
  const [resyncStock] = useResyncStockMutation();
  const [resyncingAsin, setResyncingAsin] = useState(null);

  const kpis = kpisData || {};

  const visibleAlerts = alertsRes?.alerts || [];
  const totalAlerts = alertsRes?.total || 0;
  const alertTotalPages = alertsRes?.total_pages || 1;

  // Keep the page in range when alerts are dismissed off the last page.
  useEffect(() => {
    if (alertPage > alertTotalPages) setAlertPage(alertTotalPages);
  }, [alertPage, alertTotalPages]);

  const handleResyncAlertStock = async (asin, country) => {
    setResyncingAsin(asin);
    try {
      const res = await resyncStock({ asin, country: country || "NL" }).unwrap();
      toast.success(res.message || "Stock resynced");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to resync stock");
    } finally {
      setResyncingAsin(null);
    }
  };

  const handleDismissAlert = async (asin) => {
    try {
      await dismissAlert({ asin }).unwrap();
      toast.success("Alert dismissed");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to dismiss alert");
    }
  };

  const handleSync = async () => {
    try {
      await syncNow().unwrap();
      toast.success("Order sync started — refresh in a moment.");
    } catch (err) {
      toast.error(err?.data?.detail || "Sync failed (check Bol credentials)");
    }
  };

  const s = dash || {};
  const donut = {
    total: s.total_order_requests || 0,
    completed: s.total_completed_orders || 0,
    canceled: s.total_cancelled_orders || 0,
  };

  const kpiCards = [
    {
      label: "Total Revenue",
      value: `€${(kpis.total_revenue || 0).toLocaleString()}`,
      icon: <FiDollarSign size={20} />,
      accent: "#111111",
    },
    {
      label: "Net Income",
      value: `€${(kpis.total_net_income || 0).toLocaleString()}`,
      icon: <FiTrendingUp size={20} />,
      accent: "#2563eb",
    },
    {
      label: "Total Order Requests",
      value: (kpis.total_order_requests || 0).toLocaleString(),
      icon: <FiShoppingBag size={20} />,
      accent: "#4b5563",
    },
    {
      label: "Completed Orders",
      value: (kpis.total_completed_orders || 0).toLocaleString(),
      icon: <FiCheckCircle size={20} />,
      accent: "#16a34a",
    },
    {
      label: "Open Customer Questions",
      value: (kpis.open_customer_questions || 0).toLocaleString(),
      icon: <FiHelpCircle size={20} />,
      accent: kpis.open_customer_questions > 0 ? "#dc2626" : "#4b5563",
    },
    {
      label: "Open Orders",
      value: (kpis.open_orders || 0).toLocaleString(),
      icon: <FiAlertCircle size={20} />,
      accent: "#d97706",
    },
    {
      label: "Open Returns",
      value: (kpis.open_returns || 0).toLocaleString(),
      icon: <FiRotateCcw size={20} />,
      accent: "#7c3aed",
    },
    {
      label: "Store Review Score",
      value:
        kpis.review_score !== null && kpis.review_score !== undefined
          ? `${kpis.review_score}/10`
          : "N/A",
      icon: <FiStar size={20} />,
      accent: "#ca8a04",
    },
  ];

  const recentOrders = ordersData?.orders || [];

  return (
    <div className="space-y-5">
      {/* Tabs + period filter */}
      <div className="bg-white rounded-lg p-4 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === key
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FiCalendar className="text-gray-400" size={16} />
            <span className="text-xs font-semibold text-gray-600">Period:</span>
          </div>
          <Select
            value={range}
            onChange={setRange}
            options={PERIOD_OPTIONS}
            className="w-40 h-10"
          />
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((c) => (
              <StatsCard key={c.label} {...c} />
            ))}
          </div>

          {/* Product lookup */}
          <div className="bg-gradient-to-r from-[#111111] to-[#333333] rounded-lg p-5 text-white card-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Find a Product</p>
                <p className="text-xs text-white/70 mt-0.5">
                  Look one EAN up across your catalog, offers and orders
                </p>
              </div>
              <div className="w-full sm:max-w-md">
                <Input
                  value={lookupTerm}
                  onChange={(e) => setLookupTerm(e.target.value)}
                  onPressEnter={handleLookup}
                  prefix={<FiSearch className="text-gray-400 mr-1" />}
                  suffix={
                    lookupTerm ? (
                      <button
                        onClick={clearLookup}
                        className="text-gray-400 hover:text-gray-700"
                        aria-label="Clear"
                      >
                        <FiX size={14} />
                      </button>
                    ) : null
                  }
                  placeholder="Enter the Product EAN"
                  className="h-11 rounded-md"
                />
              </div>
            </div>
          </div>

          {hasSearched && (
            <ProductLookupPanel
              result={lookupResult}
              isFetching={lookingUp}
              error={lookupError}
              onClear={clearLookup}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Low stock alerts */}
            <div className="lg:col-span-2 bg-white rounded-lg p-5 card-shadow space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200">
                    <FiAlertTriangle size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Low Stock Alerts</h3>
                    <p className="text-xs text-gray-400">
                      Live supplier stock levels mapped to catalog items
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {totalAlerts > 0 && (
                    <span className="px-2.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-800 font-bold text-xs">
                      {totalAlerts} Active
                    </span>
                  )}
                  <Link
                    to="/low-stock"
                    className="px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 font-semibold text-xs flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    See all <FiArrowRight size={12} />
                  </Link>
                </div>
              </div>

              {loadingAlerts ? (
                <div className="space-y-2 py-2">
                  {[...Array(ALERTS_PAGE_SIZE)].map((_, i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-md animate-pulse" />
                  ))}
                </div>
              ) : visibleAlerts.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">
                  No low stock alerts. Everything is in stock.
                </p>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {visibleAlerts.map((record) => (
                      <LowStockRow
                        key={record.id || record.asin}
                        record={record}
                        onResync={handleResyncAlertStock}
                        onDismiss={handleDismissAlert}
                        resyncing={resyncingAsin === record.asin}
                      />
                    ))}
                  </div>

                  <Pagination
                    current={alertPage}
                    total={alertTotalPages}
                    onChange={setAlertPage}
                    pageSize={ALERTS_PAGE_SIZE}
                    totalItems={totalAlerts}
                  />
                </>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-5">
              <div className="bg-white rounded-lg card-shadow overflow-hidden">
                <OrdersDonut data={donut} range={range} onRangeChange={setRange} />
              </div>

              <div className="bg-white rounded-lg p-5 card-shadow space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <FiShoppingBag className="text-blue-600" /> Recent Synced Orders
                  </p>
                  <Tooltip title="Sync orders from Bol now">
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      aria-label="Sync orders from Bol"
                      className="w-7 h-7 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <LuRefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                    </button>
                  </Tooltip>
                </div>
                {recentOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No orders synced yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {recentOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="flex items-center justify-between p-2.5 rounded-md bg-gray-50/80 border border-gray-100 text-xs hover:bg-gray-100/60 transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-gray-800 line-clamp-1">
                            {ord.productTitle}
                          </p>
                          <span className="text-[10px] text-gray-400 font-mono">
                            ID: {ord.orderId}
                          </span>
                        </div>
                        <Tag color={ord.status === "SHIPPED" ? "success" : "processing"}>
                          {ord.status}
                        </Tag>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="animate-fade-in">
          <PerformanceTab />
        </div>
      )}

      {activeTab === "sales-analysis" && (
        <div className="animate-fade-in">
          <SalesAnalysisTab range={range} />
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
