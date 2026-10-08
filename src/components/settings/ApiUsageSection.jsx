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
        {/* Amazon SP-API Catalog */}
        <div className="border border-gray-200 rounded p-3 bg-white">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Amazon SP-API (Catalog)</span>
            <StatusDot status={scraper.status} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-gray-900 font-mono">
              2.0 req/s
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              (Burst: 2)
            </span>
          </div>
          <div className="w-full bg-emerald-50 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1 rounded-full transition-all"
              style={{ width: "100%" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
            <span>Official Seller Partner API</span>
            <span>Batch: 20 ASINs</span>
          </div>
        </div>

        {/* Amazon SP-API Pricing & Stock */}
        <div className="border border-gray-200 rounded p-3 bg-white">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Amazon SP-API (Pricing & Stock)</span>
            <StatusDot status={stock.status} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-gray-900 font-mono">
              0.5 req/s
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              (Burst: 1)
            </span>
          </div>
          <div className="w-full bg-emerald-50 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1 rounded-full transition-all"
              style={{ width: "100%" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
            <span>Live BuyBox & Stock Sync</span>
            <span>Batch: 20 ASINs</span>
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
            {formatNum(cache.catalog_cache || cache.rapidapi_cache)} Catalog • {formatNum(cache.brand_cache)} Brand • {formatNum(cache.translation_cache)} Images
          </p>
        </div>
      </div>

      {/* 1. Amazon SP-API Official Services Breakdown */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Amazon Selling Partner API (Official Direct Integration)
        </p>
        <div className="border border-gray-200 rounded divide-y divide-gray-100 bg-white">
          {/* Service 1: Catalog Items */}
          <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900">
                  Amazon SP-API Catalog Items (v2022-04-01)
                </span>
                <StatusDot status={scraper.status} />
              </div>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                {scraper.host || "sellingpartnerapi-eu.amazon.com"} • Marketplace: Amazon.nl (A1805IZSGTT6HS)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-gray-600 sm:text-right">
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Rate Limit</span>
                <span className="font-semibold text-gray-900">2.0 req/s</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Batch Size</span>
                <span>20 ASINs</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Burst</span>
                <span>2 reqs</span>
              </div>
            </div>
          </div>

          {/* Service 2: Competitive Pricing & Offers */}
          <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900">
                  Amazon SP-API Pricing & Offers (v0)
                </span>
                <StatusDot status={stock.status} />
              </div>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                {stock.host || "sellingpartnerapi-eu.amazon.com"} • Live Landed Prices, BuyBox & Stock
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-gray-600 sm:text-right">
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Rate Limit</span>
                <span className="font-semibold text-gray-900">0.5 req/s</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Batch Size</span>
                <span>20 ASINs</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">Burst</span>
                <span>1 req</span>
              </div>
            </div>
          </div>

          {/* Service 3: Image Translation Pipeline */}
          <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900">
                  Product Image Translation Pipeline
                </span>
                <StatusDot status="ONLINE" />
              </div>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                EasyOCR + Google Translate Pipeline • AWS S3 Permanent Bucket
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
                <span>Google / OCR</span>
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
              <span className="font-medium text-gray-900">AI Intelligence (OpenCode Go)</span>
              <span className="text-gray-400 font-mono">DeepSeek & GPT Luna</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 font-mono text-[11px]">
              <span>Primary: {ai.opencode_primary?.model || "deepseek-v4.1-flash"}</span>
              <span>Fallback: {ai.opencode_fallback?.model || "gpt-6-luna"}</span>
              <StatusDot status={ai.opencode_primary?.status || ai.openai?.status} />
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
