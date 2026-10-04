import { useState } from "react";
import { Drawer, Tag, Tooltip } from "antd";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiAward,
  FiInfo,
  FiRotateCcw,
  FiShoppingBag,
  FiCalendar,
  FiClock,
  FiPackage,
} from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import { useGetPerformanceQuery } from "../../Redux/analyticsApis";
import { useUI } from "../../Provider/ContextProvider";

const STATUS_STYLES = {
  green: {
    card: "border-emerald-100 hover:border-emerald-200",
    dot: "bg-emerald-500",
    value: "text-emerald-700",
    tag: "success",
  },
  red: {
    card: "border-red-200 bg-red-50/20 hover:border-red-300",
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

/** One Bol performance indicator, rendered from Bol's official norm + score. */
const IndicatorCard = ({ indicator, onClick }) => {
  const st = STATUS_STYLES[indicator.status] || STATUS_STYLES.unknown;
  const clickable = indicator.status === "red";

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white rounded-lg p-4 card-shadow border transition-all ${st.card} ${
        clickable ? "cursor-pointer hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
          {indicator.label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {indicator.description && (
            <Tooltip title={indicator.description}>
              <FiInfo size={12} className="text-gray-300 hover:text-gray-500 cursor-pointer" />
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
          <Tag color={st.tag} className="shrink-0 font-medium text-[11px]">
            Norm: {indicator.norm_label}
          </Tag>
        )}
      </div>

      {indicator.has_data ? (
        <p className="text-[11px] text-gray-400 mt-2.5">
          {indicator.numerator !== null && indicator.denominator ? (
            <>
              {indicator.numerator} of {indicator.denominator}
              {indicator.status === "red" && " · below Bol norm"}
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

const PerformanceTab = ({ accountId: propAccountId }) => {
  const { activeBolAccountId } = useUI();
  const currentAccountId = propAccountId || activeBolAccountId;

  // Poll every 60s for automatic background refresh; refetch on account change
  const {
    data: perf,
    isLoading,
    isFetching,
    refetch,
  } = useGetPerformanceQuery(currentAccountId, {
    pollingInterval: 60000,
    skip: !currentAccountId,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerDetail, setActiveDrawerDetail] = useState(null);

  const p = perf || {};
  const indicators = p.indicators || [];

  const openDrawer = (title, items, type = "alerts") => {
    setActiveDrawerDetail({ title, items, type });
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

  const syncedTime = p.synced_at
    ? new Date(p.synced_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-5">
      {/* Header with live sync indicators */}
      <div className="bg-gradient-to-r from-[#111111] to-[#252525] text-white rounded-lg p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FiAward size={20} className="text-yellow-400" />
            <h2 className="text-base font-bold">Bol Retailer Performance</h2>
            <span className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full font-mono">
              Live Bol.com API
            </span>
          </div>
          <p className="text-xs text-white/70 mt-1 flex items-center gap-2 flex-wrap">
            <span>Period: {periodLabel}</span>
            {syncedTime && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FiClock size={11} /> Updated: {syncedTime}
                </span>
              </>
            )}
            <span>•</span>
            <span className="text-emerald-400 font-medium">Auto-refresh active</span>
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-4 py-2 rounded-md transition-all self-start md:self-auto border border-white/10 flex items-center gap-2 disabled:opacity-50"
        >
          <LuRefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          {isFetching ? "Updating..." : "Refresh"}
        </button>
      </div>

      {/* Real Bol Account Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Open Returns straight from Bol API */}
        <div
          onClick={() =>
            (p.open_returns || []).length > 0 &&
            openDrawer("Open Customer Returns", p.open_returns, "returns")
          }
          className={`bg-white rounded-lg p-4 card-shadow border transition-all ${
            (p.open_returns_count || 0) > 0
              ? "border-amber-200 bg-amber-50/20 cursor-pointer hover:border-amber-300"
              : "border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Open Returns
            </span>
            <FiRotateCcw
              className={(p.open_returns_count || 0) > 0 ? "text-amber-500" : "text-gray-400"}
              size={16}
            />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                (p.open_returns_count || 0) > 0 ? "text-amber-600" : "text-gray-900"
              }`}
            >
              {p.open_returns_count ?? 0}
            </span>
            <Tag color={(p.open_returns_count || 0) > 0 ? "warning" : "success"}>
              {(p.open_returns_count || 0) > 0 ? "Action Required" : "All Handled"}
            </Tag>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {(p.open_returns_count || 0) > 0
              ? "Click to view open customer returns"
              : "No unhandled customer returns in Bol"}
          </p>
        </div>

        {/* Open Orders Awaiting Fulfillment straight from Bol API */}
        <div
          onClick={() =>
            (p.open_orders || []).length > 0 &&
            openDrawer("Open Orders Awaiting Shipping", p.open_orders, "orders")
          }
          className={`bg-white rounded-lg p-4 card-shadow border transition-all ${
            (p.open_orders_count || 0) > 0
              ? "border-blue-200 bg-blue-50/20 cursor-pointer hover:border-blue-300"
              : "border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Pending Orders
            </span>
            <FiShoppingBag
              className={(p.open_orders_count || 0) > 0 ? "text-blue-500" : "text-gray-400"}
              size={16}
            />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                (p.open_orders_count || 0) > 0 ? "text-blue-600" : "text-gray-900"
              }`}
            >
              {p.open_orders_count ?? 0}
            </span>
            <Tag color={(p.open_orders_count || 0) > 0 ? "blue" : "default"}>
              {(p.open_orders_count || 0) > 0 ? "Awaiting Shipment" : "None Pending"}
            </Tag>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {(p.open_orders_count || 0) > 0
              ? "Click to view open Bol orders"
              : "No open orders waiting for shipment"}
          </p>
        </div>

        {/* Evaluation Period from Bol API */}
        <div className="bg-white rounded-lg p-4 card-shadow border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Scored Period
            </span>
            <FiCalendar className="text-gray-400" size={16} />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-gray-900">{periodLabel}</span>
            <Tag color={p.indicators_available ? "success" : "default"}>
              {p.indicators_available ? "Settled" : "Pending"}
            </Tag>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Evaluated and published weekly by Bol
          </p>
        </div>
      </div>

      {!p.indicators_available && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-2.5">
          <FiAlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={16} />
          <div>
            <p className="text-xs font-semibold text-amber-900">
              No scored performance data published by Bol yet
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Bol publishes official performance scores once orders are delivered and settled in
              completed weeks. Until Bol scores this account, figures will remain empty rather than
              showing inaccurate estimates.
            </p>
          </div>
        </div>
      )}

      {/* Official Bol Performance Indicators */}
      {indicators.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-800">Performance Indicators</h3>
              <span className="text-[11px] text-gray-400">({indicators.length} tracked metrics)</span>
            </div>
            {p.breached_count > 0 ? (
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <FiAlertTriangle size={12} /> {p.breached_count} below norm
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <FiCheckCircle size={12} /> All standards met
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {indicators.map((ind) => (
              <IndicatorCard
                key={ind.name}
                indicator={ind}
                onClick={() => openDrawer(`${ind.label} — affected orders`, p.offending_orders, "alerts")}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slide-out Drawer for details */}
      <Drawer
        title={activeDrawerDetail?.title || "Details"}
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={480}
      >
        <div className="space-y-3">
          {activeDrawerDetail?.type === "returns" && (
            <>
              <p className="text-xs text-gray-500 mb-2">
                Open / unhandled customer returns retrieved straight from Bol Retailer API.
              </p>
              {(!activeDrawerDetail.items || activeDrawerDetail.items.length === 0) ? (
                <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-lg">
                  No open returns for this account.
                </div>
              ) : (
                activeDrawerDetail.items.map((ret, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span>RMA #{ret.rmaId || ret.returnId || idx + 1}</span>
                      <Tag color="orange">Unhandled</Tag>
                    </div>
                    {ret.orderId && <p className="text-gray-500">Order #{ret.orderId}</p>}
                    {ret.ean && <p className="font-mono text-gray-500">EAN: {ret.ean}</p>}
                    {ret.registrationDateTime && (
                      <p className="text-[10px] text-gray-400">
                        Date: {new Date(ret.registrationDateTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {activeDrawerDetail?.type === "orders" && (
            <>
              <p className="text-xs text-gray-500 mb-2">
                Open orders waiting for shipment retrieved straight from Bol Retailer API.
              </p>
              {(!activeDrawerDetail.items || activeDrawerDetail.items.length === 0) ? (
                <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-lg">
                  No open orders waiting for shipment.
                </div>
              ) : (
                activeDrawerDetail.items.map((ord, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span>Order #{ord.orderId || idx + 1}</span>
                      <Tag color="blue">OPEN</Tag>
                    </div>
                    {ord.orderPlacedDateTime && (
                      <p className="text-[10px] text-gray-400">
                        Placed: {new Date(ord.orderPlacedDateTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {activeDrawerDetail?.type === "alerts" && (
            <>
              <p className="text-xs text-gray-500 mb-2">
                Orders or events that influenced metric breaches for this account.
              </p>
              {(!activeDrawerDetail.items || activeDrawerDetail.items.length === 0) ? (
                <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-lg">
                  No breach events recorded for this account.
                </div>
              ) : (
                activeDrawerDetail.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50/50 rounded-md border border-red-100 flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span>Order #{item.orderId || `EVENT-${idx + 1}`}</span>
                      <Tag color="volcano">{item.status || "Breach"}</Tag>
                    </div>
                    <p className="text-gray-600">{item.reason || "Late delivery or cancellation threshold violation"}</p>
                    {item.date && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.date).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default PerformanceTab;
