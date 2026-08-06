import { useState } from "react";
import { Drawer, Tag } from "antd";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiShield,
  FiTruck,
  FiStar,
  FiAward,
  FiXCircle,
} from "react-icons/fi";
import { useGetPerformanceQuery } from "../../Redux/analyticsApis";

const PerformanceTab = () => {
  const { data: perf, isLoading, refetch } = useGetPerformanceQuery();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeAlertDetail, setActiveAlertDetail] = useState(null);

  const p = perf || {};

  const handleOpenAlertDrawer = (title, items) => {
    setActiveAlertDetail({ title, items });
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-white rounded-2xl animate-pulse space-y-4 card-shadow">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-gray-100 rounded-xl"></div>
          <div className="h-32 bg-gray-100 rounded-xl"></div>
          <div className="h-32 bg-gray-100 rounded-xl"></div>
          <div className="h-32 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner - Matching App Signature Dark Gradient */}
      <div className="bg-gradient-to-r from-[#111111] to-[#333333] text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FiAward size={22} className="text-yellow-400" />
            <h2 className="text-lg font-bold">Bol.com Partner Performance Overview</h2>
          </div>
          <p className="text-xs text-white/70 mt-1">
            Real-time quality scores, delivery promptness, and policy point evaluation thresholds directly from Bol.com Retailer API.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-4 py-2 rounded-xl backdrop-blur-md transition-all self-start md:self-auto border border-white/10"
        >
          Refresh Indicators
        </button>
      </div>

      {/* Grid of 4 Core Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Growth Start */}
        <div className="bg-white rounded-2xl p-5 card-shadow border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Growth Start Status
              </span>
              <FiStar className="text-amber-500" size={18} />
            </div>
            <div className="mt-3">
              {p.growth_start_achieved ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                  <FiCheckCircle size={14} /> Growth Power Achieved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                  <FiAlertTriangle size={14} /> {p.evaluation_phase || "Phase 1"} Evaluation
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4">
            Evaluated by Bol partner program
          </p>
        </div>

        {/* 2. Quality Score */}
        <div
          onClick={() =>
            p.quality_score_alert &&
            handleOpenAlertDrawer("Quality Score Issues", p.offending_orders)
          }
          className={`bg-white rounded-2xl p-5 card-shadow border transition-all cursor-pointer ${
            p.quality_score_status === "red"
              ? "border-red-300 bg-red-50/20 hover:border-red-400"
              : "border-gray-100 hover:border-green-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quality Score
            </span>
            <span
              className={`w-3 h-3 rounded-full ${
                p.quality_score_status === "red" ? "bg-red-500 animate-ping" : "bg-green-500"
              }`}
            ></span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                p.quality_score_status === "red" ? "text-red-600" : "text-gray-900"
              }`}
            >
              {p.quality_score !== null && p.quality_score !== undefined ? `${p.quality_score}/100` : "N/A"}
            </span>
            <Tag color={p.quality_score_status === "red" ? "error" : "success"}>
              Threshold: 70
            </Tag>
          </div>
          {p.quality_score_alert ? (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 font-medium underline">
              <FiAlertTriangle size={14} /> Below threshold! Click for causes
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 mt-3">
              {p.quality_score !== null ? "Score is above target threshold" : "Connect Bol API keys for live metric"}
            </p>
          )}
        </div>

        {/* 3. Delivered On Time */}
        <div
          onClick={() =>
            p.delivered_on_time_alert &&
            handleOpenAlertDrawer("Late Delivery Orders", p.offending_orders)
          }
          className={`bg-white rounded-2xl p-5 card-shadow border transition-all cursor-pointer ${
            p.delivered_on_time_status === "red"
              ? "border-red-300 bg-red-50/20 hover:border-red-400"
              : "border-gray-100 hover:border-green-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              % Delivered On Time
            </span>
            <FiTruck
              className={p.delivered_on_time_status === "red" ? "text-red-500" : "text-green-600"}
              size={18}
            />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                p.delivered_on_time_status === "red" ? "text-red-600" : "text-gray-900"
              }`}
            >
              {p.delivered_on_time_pct !== null && p.delivered_on_time_pct !== undefined ? `${p.delivered_on_time_pct}%` : "N/A"}
            </span>
            <Tag color={p.delivered_on_time_status === "red" ? "error" : "success"}>
              Target: 93%
            </Tag>
          </div>
          {p.delivered_on_time_alert ? (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 font-medium underline">
              <FiAlertTriangle size={14} /> Action Required! View late orders
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 mt-3">
              {p.delivered_on_time_pct !== null ? "High delivery promptness" : "Connect Bol API keys for live metric"}
            </p>
          )}
        </div>

        {/* 4. Policy Points */}
        <div
          onClick={() =>
            handleOpenAlertDrawer("Policy Point Deductions Log", p.policy_deductions)
          }
          className={`bg-white rounded-2xl p-5 card-shadow border transition-all cursor-pointer ${
            p.policy_points_status === "red"
              ? "border-red-500 bg-red-50/40 hover:border-red-600"
              : "border-gray-100 hover:border-green-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Policy Points
            </span>
            <FiShield
              className={p.policy_points_status === "red" ? "text-red-600" : "text-green-600"}
              size={18}
            />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                p.policy_points < 60 ? "text-red-600 animate-pulse" : "text-gray-900"
              }`}
            >
              {p.policy_points !== undefined ? `${p.policy_points}/100` : "100/100"}
            </span>
            <Tag color={p.policy_points < 60 ? "error" : "blue"}>
              Limit: 60/100
            </Tag>
          </div>
          {p.policy_points < 60 ? (
            <div className="mt-3 text-xs text-red-600 font-bold flex items-center gap-1">
              <FiXCircle size={14} /> WARNING: Account Closure Risk!
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 mt-3">Click to view policy log</p>
          )}
        </div>
      </div>

      {/* Interactive Alert Detail Drawer */}
      <Drawer
        title={activeAlertDetail?.title || "Indicator Breakdown"}
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={450}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Below is the list of orders, shipments, or policy events that influenced this metric threshold.
          </p>

          {!activeAlertDetail?.items || activeAlertDetail.items.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
              No active breach events found for this store account.
            </div>
          ) : (
            activeAlertDetail.items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex flex-col gap-1 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-gray-800">
                  <span>Order #{item.orderId || `EVENT-${idx + 1}`}</span>
                  <Tag color="volcano">{item.status || "Breach"}</Tag>
                </div>
                <p className="text-gray-600 mt-0.5">{item.reason || "Late delivery or policy deduction"}</p>
                {item.date && (
                  <span className="text-[10px] text-gray-400">
                    Date: {new Date(item.date).toLocaleString()}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default PerformanceTab;
