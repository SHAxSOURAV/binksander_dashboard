import React from "react";
import { Spin } from "antd";
import toast from "react-hot-toast";
import { FiRefreshCw } from "react-icons/fi";
import {
  useGetApiUsageSummaryQuery,
  useRefreshApiUsageMutation,
} from "../../Redux/apiUsageApis";

const ApiUsageSection = () => {
  const { data: usageData, isLoading, isFetching } = useGetApiUsageSummaryQuery();
  const [refreshUsage, { isLoading: isRefreshing }] = useRefreshApiUsageMutation();

  const handleManualRefresh = async () => {
    try {
      await refreshUsage().unwrap();
      toast.success("Metrics updated");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update");
    }
  };

  if (isLoading && !usageData) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-400">
        <Spin size="small" />
      </div>
    );
  }

  const rapid = usageData?.rapidapi_services || {};
  const scraper = rapid?.amazon_scraper || {};
  const stock = rapid?.amazon_stock || {};
  const torii = rapid?.torii_translator || {};

  const cache = usageData?.cache_savings || {};
  const bol = usageData?.bol || {};
  const sheets = usageData?.google_sheets || {};
  const ai = usageData?.ai || {};
  const tavily = usageData?.tavily || {};
  const s3 = usageData?.s3 || {};

  const formatNum = (n) => (typeof n === "number" ? n.toLocaleString() : "—");

  const StatusDot = ({ status }) => {
    const isOk = status === "ONLINE" || status === "CONNECTED";
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOk ? "bg-emerald-500" : "bg-gray-300"
          }`}
        />
        {isOk ? "Active" : status === "NOT_CONFIGURED" ? "Not Set" : "Standby"}
      </span>
    );
  };

  return (
    <div className="font-poppins text-gray-800 animate-fade-in pb-4">
      {/* Clean Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">API Usage</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Quota tracking and service limits
          </p>
        </div>
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing || isFetching}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-colors"
        >
          <FiRefreshCw
            size={12}
            className={isRefreshing || isFetching ? "animate-spin" : ""}
          />
          {isRefreshing ? "Updating..." : "Refresh"}
        </button>
      </div>

      {/* Top 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
        {/* Amazon Scraper Quota */}
        <div className="border border-gray-200 rounded p-3 bg-white">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Amazon Scraper</span>
            <StatusDot status={scraper.status} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-gray-900 font-mono">
              {formatNum(scraper.requests_remaining)}
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              / {formatNum(scraper.requests_limit)} left
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className="bg-gray-800 h-1 rounded-full transition-all"
              style={{ width: `${Math.min(100, scraper.usage_percent || 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
            <span>{scraper.usage_percent || 0}% used</span>
            <span>Resets in ~{scraper.reset_in_days || 0}d</span>
          </div>
        </div>

        {/* Amazon Stock Quota */}
        <div className="border border-gray-200 rounded p-3 bg-white">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Amazon Stock (Accurate)</span>
            <StatusDot status={stock.status} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-gray-900 font-mono">
              {formatNum(stock.requests_remaining)}
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              / {formatNum(stock.requests_limit)} left
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className="bg-gray-800 h-1 rounded-full transition-all"
              style={{ width: `${Math.min(100, stock.usage_percent || 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
            <span>{stock.usage_percent || 0}% used</span>
            <span>Resets in ~{stock.reset_in_days || 0}d</span>
          </div>
        </div>

        {/* Cache Savings */}
        <div className="border border-gray-200 rounded p-3 bg-white">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Saved Calls (Cache)</span>
            <span className="text-[10.5px] text-gray-400 font-mono">MongoDB</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-gray-900 font-mono">
              {formatNum(cache.total_saved_calls)}
            </span>
            <span className="text-[11px] text-gray-400">calls saved</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 truncate font-mono">
            {formatNum(cache.rapidapi_cache)} Amazon • {formatNum(cache.brand_cache)} Brand • {formatNum(cache.translation_cache)} Images
          </p>
        </div>
      </div>

      {/* 1. RapidAPI Services Breakdown */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          RapidAPI Services (3 Integrations)
        </p>
        <div className="border border-gray-200 rounded divide-y divide-gray-100 bg-white">
          {/* Service 1: Scraper */}
          <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900">
                  {scraper.name || "Real-Time Amazon Data"}
                </span>
                <StatusDot status={scraper.status} />
              </div>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                {scraper.host || "real-time-amazon-data.p.rapidapi.com"}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-gray-600 sm:text-right">
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Remaining</span>
                <span className="font-semibold text-gray-900">
                  {formatNum(scraper.requests_remaining)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Used</span>
                <span>{formatNum(scraper.requests_used)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Limit</span>
                <span>{formatNum(scraper.requests_limit)}</span>
              </div>
            </div>
          </div>

          {/* Service 2: Stock Most Complete */}
          <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900">
                  {stock.name || "Real-Time Amazon Stock (Most Complete)"}
                </span>
                <StatusDot status={stock.status} />
              </div>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                {stock.host || "real-time-amazon-data-the-most-complete.p.rapidapi.com"}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-gray-600 sm:text-right">
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Remaining</span>
                <span className="font-semibold text-gray-900">
                  {formatNum(stock.requests_remaining)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Used</span>
                <span>{formatNum(stock.requests_used)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Limit</span>
                <span>{formatNum(stock.requests_limit)}</span>
              </div>
            </div>
          </div>

          {/* Service 3: Torii Image Translator */}
          <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900">
                  {torii.name || "Torii Image Translator"}
                </span>
                <StatusDot status={torii.status} />
              </div>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                {torii.host || "torii-image-translator.p.rapidapi.com"}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-gray-600 sm:text-right">
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Cached Images</span>
                <span className="font-semibold text-gray-900">
                  {formatNum(cache.translation_cache)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Engine</span>
                <span>Gemini 2.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Other Core Services */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Other Platform Services
        </p>
        <div className="border border-gray-200 rounded divide-y divide-gray-100 bg-white text-xs">
          {/* Bol.com */}
          <div className="p-2.5 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">Bol.com Retailer API</span>
              <span className="text-gray-400 font-mono">250 req/min</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 font-mono text-[11px]">
              <span>{bol.accounts_count || 0} accounts</span>
              <span>{formatNum(bol.total_offers)} offers</span>
              <span>{formatNum(bol.total_orders)} orders</span>
              <StatusDot status={bol.status} />
            </div>
          </div>

          {/* Google Sheets */}
          <div className="p-2.5 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">Google Sheets API</span>
              <span className="text-gray-400 font-mono">300 req/min</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 font-mono text-[11px]">
              <span>{sheets.sheets_count || 0} sheets</span>
              <span>{formatNum(sheets.total_items)} items</span>
              <StatusDot status={sheets.status} />
            </div>
          </div>

          {/* AI Providers */}
          <div className="p-2.5 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">AI Intelligence</span>
              <span className="text-gray-400 font-mono">Gemini & Claude</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 font-mono text-[11px]">
              <span>Gemini: {ai.gemini?.model || "gemini-2.0-flash"}</span>
              <span>Claude: {ai.anthropic?.model || "claude-haiku"}</span>
              <StatusDot status={ai.gemini?.status} />
            </div>
          </div>

          {/* Tavily & AWS S3 */}
          <div className="p-2.5 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">Storage & Verification</span>
              <span className="text-gray-400 font-mono">AWS S3 & Tavily</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 font-mono text-[11px]">
              <span>Bucket: {s3.bucket || "amzn-s3-bol-automation"}</span>
              <span>Brand checks: {formatNum(tavily.cached_checks)}</span>
              <StatusDot status={s3.status} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiUsageSection;
