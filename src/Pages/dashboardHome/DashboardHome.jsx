import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "antd";
import {
  FiSearch,
  FiTrendingUp,
  FiDollarSign,
  FiShoppingBag,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import toast from "react-hot-toast";
import StatsCard from "../../components/dashboard/StatsCard";
import OrdersDonut from "../../components/dashboard/OrdersDonut";
import {
  useGetDashboardQuery,
  useGetBolOrdersQuery,
  useSyncNowMutation,
} from "../../Redux/analyticsApis";
import {
  useGetLowStockAlertsQuery,
  useDismissLowStockAlertMutation,
  useResyncStockMutation,
} from "../../Redux/productApis";

const DashboardHome = () => {
  const [range, setRange] = useState("30d");
  const [trackId, setTrackId] = useState("");

  const { data: dash, isFetching } = useGetDashboardQuery(range);
  const { data: ordersData } = useGetBolOrdersQuery({ page: 1, limit: 5 });
  const [syncNow, { isLoading: syncing }] = useSyncNowMutation();
  const { data: alertsRes } = useGetLowStockAlertsQuery();
  const [dismissAlert] = useDismissLowStockAlertMutation();
  const [resyncStock] = useResyncStockMutation();
  const [resyncingAsin, setResyncingAsin] = useState(null);

  const lowStockAlerts = alertsRes?.alerts || [];

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

  const s = dash || {};
  const donut = {
    total: s.total_order_requests || 0,
    completed: s.total_completed_orders || 0,
    canceled: s.total_cancelled_orders || 0,
  };

  const cards = [
    {
      label: "Total Revenue",
      value: `€${(s.total_revenue || 0).toLocaleString()}`,
      icon: <FiDollarSign size={20} />,
      accent: "#1B17E0",
    },
    {
      label: "Net Income",
      value: `€${(s.total_net_income || 0).toLocaleString()}`,
      icon: <FiTrendingUp size={20} />,
      accent: "#16A34A",
    },
    {
      label: "Total Order Request",
      value: (s.total_order_requests || 0).toLocaleString(),
      icon: <FiShoppingBag size={20} />,
      accent: "#F59E0B",
    },
    {
      label: "Total Completed Order",
      value: (s.total_completed_orders || 0).toLocaleString(),
      icon: <FiCheckCircle size={20} />,
      accent: "#6C63FF",
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

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <StatsCard key={c.label} {...c} />
        ))}
      </div>

      {/* Track your order */}
      <div className="bg-gradient-to-r from-[#1B17E0] to-[#4B45F0] rounded-2xl p-5 sm:p-6 text-white card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Track Your Order</p>
            <p className="text-xs text-white/70 mt-0.5">
              Enter a product ID to see its live delivery status
            </p>
          </div>
          <div className="flex gap-2 w-full sm:max-w-md">
            <Input
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              prefix={<FiSearch className="text-gray-400 mr-1" />}
              placeholder="Enter Product ID"
              className="h-11 rounded-xl"
            />
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-white text-brand font-semibold px-5 rounded-xl text-sm hover:bg-white/90 whitespace-nowrap flex items-center gap-2 disabled:opacity-60"
            >
              <LuRefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Chart + Right column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <OrdersDonut data={donut} range={range} onRangeChange={setRange} />
        </div>

        <div className="space-y-4">
          {/* Status summary */}
          <div className="bg-white rounded-2xl p-5 card-shadow">
            <p className="text-sm font-semibold mb-3 text-gray-700">
              Order Status {isFetching && <span className="text-xs text-gray-300">· updating…</span>}
            </p>
            <Row label="Requests" value={donut.total} dot="#1B17E0" />
            <Row label="Completed" value={donut.completed} dot="#16A34A" />
            <Row label="Cancelled" value={donut.canceled} dot="#EF4444" />
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl p-5 card-shadow">
            <p className="text-sm font-semibold text-gray-700 mb-4">Recent Orders</p>
            {recentOrders.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No orders yet. Click Sync to pull from Bol.com.
              </p>
            ) : (
              <div className="space-y-1">
                {recentOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate max-w-[150px]">
                        {o.productTitle}
                      </p>
                      <p className="text-[11px] text-gray-400">{o.orderId}</p>
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      €{o.totalRevenue}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts Banner at Bottom */}
      {lowStockAlerts?.length > 0 && (
        <div className="bg-white border border-amber-200/80 rounded-2xl p-5 card-shadow space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600">
                <FiAlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  Low Stock Alerts
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-sm">
                    {lowStockAlerts.length} Item{lowStockAlerts.length > 1 ? 's' : ''}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Products with stock quantity &le; 3 require immediate replenishment.</p>
              </div>
            </div>
            <Link to="/products" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
              View Inventory Catalog &rarr;
            </Link>
          </div>

          {/* Aesthetic Vertical List View */}
          <div className="bg-slate-50/50 rounded-xl border border-slate-200/70 overflow-hidden divide-y divide-slate-100">
            {lowStockAlerts.map((alert) => (
              <div key={alert.id || alert.asin} className="p-3 sm:px-4 flex items-center justify-between gap-4 hover:bg-white transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Thumbnail Image */}
                  <div className="w-11 h-11 rounded-lg bg-white border border-slate-200/80 p-1 flex-shrink-0 flex items-center justify-center shadow-2xs">
                    {alert.image ? (
                      <img src={alert.image} alt={alert.product_title} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">ASIN</span>
                    )}
                  </div>

                  {/* Title & ASIN */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate" title={alert.product_title}>
                      {alert.product_title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400">ASIN: {alert.asin}</span>
                      {alert.country && (
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">({alert.country})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0 min-w-[70px]">
                  <p className="text-xs font-bold text-brand">
                    {alert.price ? (String(alert.price).startsWith('€') ? alert.price : `€${alert.price}`) : '—'}
                  </p>
                </div>

                {/* Stock Badge */}
                <div className="flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-2xs ${alert.stock_quantity === 0 ? 'bg-red-50 text-red-600 border border-red-200/80' : 'bg-amber-50 text-amber-800 border border-amber-300'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${alert.stock_quantity === 0 ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                    {alert.stock_quantity === 0 ? 'Out of stock' : `Only ${alert.stock_quantity} left`}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    title="Resync stock now"
                    disabled={resyncingAsin === alert.asin}
                    onClick={() => handleResyncAlertStock(alert.asin, alert.country)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-brand hover:text-white border border-slate-200 text-slate-600 text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <LuRefreshCw size={12} className={resyncingAsin === alert.asin ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Resync</span>
                  </button>
                  <button
                    type="button"
                    title="Dismiss alert"
                    onClick={() => dismissAlert({ asin: alert.asin })}
                    className="p-1.5 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-400 transition-all cursor-pointer shadow-2xs"
                  >
                    <FiX size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, dot }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
    <span className="flex items-center gap-2 text-sm text-gray-500">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
      {label}
    </span>
    <span className="text-sm font-semibold text-gray-700">{value}</span>
  </div>
);

export default DashboardHome;
