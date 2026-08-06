import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input, Select, Tag, Table, Popconfirm } from "antd";
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
  FiExternalLink,
  FiX,
  FiBox,
} from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import toast from "react-hot-toast";
import StatsCard from "../../components/dashboard/StatsCard";
import OrdersDonut from "../../components/dashboard/OrdersDonut";
import PerformanceTab from "../../components/dashboard/PerformanceTab";
import SalesAnalysisTab from "../../components/dashboard/SalesAnalysisTab";

import {
  useGetDashboardQuery,
  useGetKpisQuery,
  useGetBolOrdersQuery,
  useSyncNowMutation,
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

const DashboardHome = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Retain selected period filter across sessions
  const [range, setRange] = useState(() => {
    return localStorage.getItem("bol_dashboard_period") || "30d";
  });

  useEffect(() => {
    localStorage.setItem("bol_dashboard_period", range);
  }, [range]);

  const [trackId, setTrackId] = useState("");

  const { data: dash } = useGetDashboardQuery(range);
  const { data: kpisData } = useGetKpisQuery(range);
  const { data: ordersData } = useGetBolOrdersQuery({ page: 1, limit: 5 });
  const [syncNow, { isLoading: syncing }] = useSyncNowMutation();

  const { data: alertsRes, isLoading: loadingAlerts } = useGetLowStockAlertsQuery();
  const [dismissAlert] = useDismissLowStockAlertMutation();
  const [resyncStock] = useResyncStockMutation();
  const [resyncingAsin, setResyncingAsin] = useState(null);

  const lowStockAlerts = alertsRes?.alerts || [];
  const kpis = kpisData || {};

  const handleResyncAlertStock = async (asin, country) => {
    setResyncingAsin(asin);
    try {
      const res = await resyncStock({ asin, country: country || "NL" }).unwrap();
      toast.success(res.message || "Stock resynced!");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to resync stock");
    } finally {
      setResyncingAsin(null);
    }
  };

  const handleDismissAlert = async (id) => {
    try {
      await dismissAlert(id).unwrap();
      toast.success("Alert dismissed");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to dismiss alert");
    }
  };

  const s = dash || {};
  const donut = {
    total: s.total_order_requests || 0,
    completed: s.total_completed_orders || 0,
    canceled: s.total_cancelled_orders || 0,
  };

  // Section 1.2 Store-Level KPI Cards
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
      value: kpis.review_score !== null && kpis.review_score !== undefined ? `${kpis.review_score}/10` : "N/A",
      icon: <FiStar size={20} />,
      accent: "#ca8a04",
    },
  ];

  const recentOrders = ordersData?.orders || [];

  const handleSync = async () => {
    try {
      await syncNow().unwrap();
      toast.success("Order sync started — refresh in a moment.");
    } catch (err) {
      toast.error(err?.data?.detail || "Sync failed (check Bol credentials)");
    }
  };

  // Low Stock Table Columns
  const lowStockColumns = [
    {
      title: "Product / Supplier Details",
      dataIndex: "product_title",
      key: "product_title",
      render: (text, record) => {
        const country = (record.country || "NL").toLowerCase();
        const amazonUrl = `https://www.amazon.${country === "nl" ? "nl" : country}/dp/${record.asin}`;
        return (
          <div className="flex items-center gap-3">
            {record.image ? (
              <img
                src={record.image}
                alt={record.asin}
                className="w-10 h-10 object-contain rounded-lg border border-gray-200 bg-white shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                <FiBox size={18} />
              </div>
            )}
            <div className="min-w-0">
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
                {text || record.title || record.name || `ASIN ${record.asin}`}
                <FiExternalLink size={12} className="text-gray-400 shrink-0" />
              </a>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400 font-mono">ASIN: {record.asin}</span>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                  {record.country || "NL"}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 90,
      render: (price) => (
        <span className="font-semibold text-gray-700 text-xs">
          {price ? (strPrice => strPrice.startsWith("€") ? strPrice : `€${strPrice}`)(String(price)) : "—"}
        </span>
      ),
    },
    {
      title: "Stock Status",
      dataIndex: "stock",
      key: "stock",
      width: 120,
      render: (stock) => {
        const qty = stock ?? 0;
        return qty === 0 ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 text-[11px] font-bold">
            Out of Stock (0)
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-bold">
            Low Stock ({qty})
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleResyncAlertStock(record.asin, record.country)}
            disabled={resyncingAsin === record.asin}
            className="px-3 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-semibold text-[11px] flex items-center gap-1 transition-all disabled:opacity-50 shadow-sm"
          >
            <LuRefreshCw size={11} className={resyncingAsin === record.asin ? "animate-spin" : ""} />
            Resync
          </button>
          <Popconfirm
            title="Dismiss alert?"
            onConfirm={() => handleDismissAlert(record.id || record.asin)}
            okText="Yes"
            cancelText="No"
          >
            <button className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
              <FiX size={14} />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action & Period Filter Header */}
      <div className="bg-white rounded-2xl p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-gray-900 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FiActivity size={16} /> Overview & Store KPIs
          </button>

          <button
            onClick={() => setActiveTab("performance")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "performance"
                ? "bg-gray-900 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FiAward size={16} /> Bol Performance Block
          </button>

          <button
            onClick={() => setActiveTab("sales-analysis")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "sales-analysis"
                ? "bg-gray-900 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FiBarChart2 size={16} /> Sales & Productgroepen Analysis
          </button>
        </div>

        {/* Section 1.1 Period Filter Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FiCalendar className="text-gray-400" size={16} />
            <span className="text-xs font-semibold text-gray-600">Period:</span>
          </div>
          <Select
            value={range}
            onChange={setRange}
            options={PERIOD_OPTIONS}
            className="w-40 h-10 rounded-xl"
          />
        </div>
      </div>

      {/* Tab Content 1: Overview & Store KPIs */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Section 1.2 Store-Level KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((c) => (
              <StatsCard key={c.label} {...c} />
            ))}
          </div>

          {/* Track your order banner */}
          <div className="bg-gradient-to-r from-[#111111] to-[#333333] rounded-2xl p-5 sm:p-6 text-white card-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Track Your Bol Order</p>
                <p className="text-xs text-white/70 mt-0.5">
                  Enter a product ID to check live delivery status
                </p>
              </div>
              <div className="flex gap-2 w-full sm:max-w-md">
                <Input
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  prefix={<FiSearch className="text-gray-400 mr-1" />}
                  placeholder="Enter Product ID / EAN"
                  className="h-11 rounded-xl"
                />
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="bg-white text-gray-900 font-semibold px-5 rounded-xl text-sm hover:bg-white/90 whitespace-nowrap flex items-center gap-2 disabled:opacity-60"
                >
                  <LuRefreshCw size={15} className={syncing ? "animate-spin" : ""} />
                  Sync Live
                </button>
              </div>
            </div>
          </div>

          {/* Main Grid: Left = Low Stock Alerts (Expanded), Right = Order Analytics (Donut) & Recent Synced Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT CONTAINER (lg:col-span-2): LOW STOCK ALERTS WITH AMAZON DETAILS */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 card-shadow space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold border border-gray-200">
                    <FiAlertTriangle size={17} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Low Stock Alerts
                    </h3>
                    <p className="text-xs text-gray-400">
                      Live supplier stock levels mapped to catalog items
                    </p>
                  </div>
                </div>
                {lowStockAlerts.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-800 font-bold text-xs">
                    {lowStockAlerts.length} Active Alerts
                  </span>
                )}
              </div>

              <Table
                dataSource={lowStockAlerts}
                columns={lowStockColumns}
                rowKey={(r) => r.id || r.asin}
                pagination={{ pageSize: 6 }}
                loading={loadingAlerts}
                size="small"
              />
            </div>

            {/* RIGHT COLUMN: TOP = ORDER ANALYTICS (DONUT CHART), BOTTOM = RECENT SYNCED ORDERS */}
            <div className="space-y-6">
              {/* 1. ORDER ANALYTICS (DONUT CHART) */}
              <div className="bg-white rounded-2xl card-shadow overflow-hidden">
                <OrdersDonut data={donut} range={range} onRangeChange={setRange} />
              </div>

              {/* 2. RECENT SYNCED ORDERS */}
              <div className="bg-white rounded-2xl p-5 card-shadow space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <FiShoppingBag className="text-blue-600" /> Recent Synced Orders
                  </p>
                  <span className="text-[10px] text-gray-400">Latest 5</span>
                </div>
                {recentOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No orders synced yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 text-xs hover:bg-gray-100/60 transition-all"
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

      {/* Tab Content 2: Bol Performance Block */}
      {activeTab === "performance" && (
        <div className="animate-fade-in">
          <PerformanceTab />
        </div>
      )}

      {/* Tab Content 3: Sales Analysis & Category ("Productgroepen") */}
      {activeTab === "sales-analysis" && (
        <div className="animate-fade-in">
          <SalesAnalysisTab range={range} />
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
