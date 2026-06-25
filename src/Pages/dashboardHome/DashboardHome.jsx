import { useState } from "react";
import { Input } from "antd";
import {
  FiSearch,
  FiTrendingUp,
  FiDollarSign,
  FiShoppingBag,
  FiCheckCircle,
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

const DashboardHome = () => {
  const [range, setRange] = useState("30d");
  const [trackId, setTrackId] = useState("");

  const { data: dash, isFetching } = useGetDashboardQuery(range);
  const { data: ordersData } = useGetBolOrdersQuery({ page: 1, limit: 5 });
  const [syncNow, { isLoading: syncing }] = useSyncNowMutation();

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
