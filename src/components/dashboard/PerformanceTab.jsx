import { useState } from "react";
import { Drawer, Tag, Tooltip } from "antd";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiShield,
  FiStar,
  FiAward,
  FiXCircle,
  FiInfo,
} from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import { useGetPerformanceQuery } from "../../Redux/analyticsApis";

const STATUS_STYLES = {
  green: {
    card: "border-gray-100",
    dot: "bg-green-500",
    value: "text-gray-900",
    tag: "success",
  },
  red: {
    card: "border-red-200 bg-red-50/30",
    dot: "bg-red-500",
    value: "text-red-600",
    tag: "error",
  },
  unknown: {
    card: "border-gray-100",
    dot: "bg-gray-300",
    value: "text-gray-400",
    tag: "default",
  },
};

/** One Bol performance indicator, rendered from the API's own norm + score. */
const IndicatorCard = ({ indicator, onClick }) => {
  const st = STATUS_STYLES[indicator.status] || STATUS_STYLES.unknown;
  const clickable = indicator.status === "red";

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white rounded-lg p-4 card-shadow border transition-all ${st.card} ${
        clickable ? "cursor-pointer hover:border-red-300" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
          {indicator.label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {indicator.description && (
            <Tooltip title={indicator.description}>
              <FiInfo size={12} className="text-gray-300 hover:text-gray-500" />
            </Tooltip>
          )}
          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className={`text-2xl font-black ${st.value}`}>
          {indicator.has_data ? indicator.display_value : "—"}
        </span>
        {indicator.norm_label && (
          <Tag color={st.tag} className="shrink-0">
            {indicator.norm_label}
          </Tag>
        )}
      </div>

      {indicator.has_data ? (
        <p className="text-[11px] text-gray-400 mt-2.5">
          {indicator.numerator !== null && indicator.denominator ? (
            <>
              {indicator.numerator} of {indicator.denominator}
              {indicator.status === "red" && " · below Bol's norm"}
            </>
          ) : indicator.status === "red" ? (
            "Below Bol's norm"
          ) : (
            "Meets Bol's norm"
          )}
        </p>
      ) : (
        <p className="text-[11px] text-gray-400 mt-2.5">Not scored this week</p>
      )}
    </div>
  );
};

const PerformanceTab = () => {
  const { data: perf, isLoading, isFetching, refetch } = useGetPerformanceQuery();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeAlertDetail, setActiveAlertDetail] = useState(null);

  const p = perf || {};
  const indicators = p.indicators || [];

  const openDrawer = (title, items) => {
    setActiveAlertDetail({ title, items });
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg animate-pulse space-y-4 card-shadow">
        <div className="h-5 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const periodLabel = p.period?.week
    ? `Week ${p.period.week}, ${p.period.year}`
    : "Latest available";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#111111] to-[#333333] text-white rounded-lg p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FiAward size={20} className="text-yellow-400" />
            <h2 className="text-base font-bold">Bol Partner Performance</h2>
          </div>
          <p className="text-xs text-white/70 mt-1">
            Scores and norms straight from Bol&apos;s Retailer API · {periodLabel}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-4 py-2 rounded-md transition-all self-start md:self-auto border border-white/10 flex items-center gap-2 disabled:opacity-50"
        >
          <LuRefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {!p.indicators_available && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-2.5">
          <FiAlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={15} />
          <div>
            <p className="text-xs font-semibold text-amber-900">
              No scored performance data for this account yet
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Bol publishes indicators per completed week. Once the account has settled
              orders in a scored week, the tiles below fill in automatically.
            </p>
          </div>
        </div>
      )}

      {/* Account standing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 card-shadow border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Growth Start Status
            </span>
            <FiStar className="text-amber-500" size={16} />
          </div>
          <div className="mt-3">
            {p.growth_start_achieved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-green-100 text-green-800">
                <FiCheckCircle size={13} /> Growth Power Achieved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-yellow-100 text-yellow-800">
                <FiAlertTriangle size={13} /> {p.evaluation_phase || "Phase 1"} Evaluation
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Evaluated by the Bol partner program</p>
        </div>

        <div
          onClick={() => openDrawer("Policy Point Deductions", p.policy_deductions)}
          className={`bg-white rounded-lg p-4 card-shadow border cursor-pointer transition-all ${
            p.policy_points_status === "red"
              ? "border-red-300 bg-red-50/40 hover:border-red-500"
              : "border-gray-100 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Policy Points
            </span>
            <FiShield
              className={p.policy_points_status === "red" ? "text-red-600" : "text-green-600"}
              size={16}
            />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                p.policy_points < 60 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {p.policy_points ?? 100}/100
            </span>
            <Tag color={p.policy_points < 60 ? "error" : "blue"}>Minimum: 60</Tag>
          </div>
          {p.policy_points < 60 ? (
            <p className="mt-2.5 text-xs text-red-600 font-bold flex items-center gap-1">
              <FiXCircle size={13} /> Account closure risk
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-2.5">Click to view the deduction log</p>
          )}
        </div>
      </div>

      {/* Bol indicators */}
      {indicators.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">Performance Indicators</h3>
            {p.breached_count > 0 && (
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                {p.breached_count} below norm
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {indicators.map((ind) => (
              <IndicatorCard
                key={ind.name}
                indicator={ind}
                onClick={() => openDrawer(`${ind.label} — affected orders`, p.offending_orders)}
              />
            ))}
          </div>
        </div>
      )}

      <Drawer
        title={activeAlertDetail?.title || "Indicator Breakdown"}
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={450}
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Orders, shipments, or policy events that influenced this metric.
          </p>

          {!activeAlertDetail?.items || activeAlertDetail.items.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-xs text-gray-500 text-center">
              No breach events recorded for this account.
            </div>
          ) : (
            activeAlertDetail.items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-red-50/50 rounded-md border border-red-100 flex flex-col gap-1 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-gray-800">
                  <span>Order #{item.orderId || `EVENT-${idx + 1}`}</span>
                  <Tag color="volcano">{item.status || "Breach"}</Tag>
                </div>
                <p className="text-gray-600">{item.reason || "Late delivery or policy deduction"}</p>
                {item.date && (
                  <span className="text-[10px] text-gray-400">
                    {new Date(item.date).toLocaleString()}
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
