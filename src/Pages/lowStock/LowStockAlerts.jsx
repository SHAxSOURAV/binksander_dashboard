import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "antd";
import { FiAlertTriangle, FiArrowLeft, FiSearch, FiInbox } from "react-icons/fi";
import toast from "react-hot-toast";

import LowStockRow from "../../components/dashboard/LowStockRow";
import Pagination from "../../components/shared/Pagination";
import {
  useGetLowStockAlertsQuery,
  useDismissLowStockAlertMutation,
  useResyncStockMutation,
} from "../../Redux/productApis";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const LowStockAlerts = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useGetLowStockAlertsQuery({
    page,
    limit,
    search,
  });

  const [dismissAlert] = useDismissLowStockAlertMutation();
  const [resyncStock] = useResyncStockMutation();
  const [resyncingAsin, setResyncingAsin] = useState(null);

  const alerts = data?.alerts || [];
  const totalActive = data?.total || 0;
  const matched = data?.matched ?? totalActive;
  const totalPages = data?.total_pages || 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleResync = async (asin, country) => {
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

  const handleDismiss = async (asin) => {
    try {
      await dismissAlert({ asin }).unwrap();
      toast.success("Alert dismissed");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to dismiss alert");
    }
  };

  const handlePageSizeChange = (next) => {
    setLimit(next);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 rounded-md border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 flex items-center justify-center transition-colors shrink-0"
            aria-label="Back to overview"
          >
            <FiArrowLeft size={16} />
          </Link>
          <div className="w-9 h-9 rounded-md bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200 shrink-0">
            <FiAlertTriangle size={17} />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base">Low Stock Alerts</h1>
            <p className="text-xs text-gray-400">
              Live supplier stock levels mapped to catalog items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            prefix={<FiSearch className="text-gray-400 mr-1" />}
            placeholder="Search title, ASIN or EAN"
            allowClear
            className="h-10 w-full md:w-72"
          />
          <span className="px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200 text-gray-800 font-bold text-xs whitespace-nowrap">
            {totalActive} Active
          </span>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg p-5 card-shadow">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-md animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <FiInbox size={30} className="text-gray-300" />
            <p className="text-sm font-semibold text-gray-600 mt-3">
              {search ? "No alerts match your search" : "No low stock alerts"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search
                ? "Try a different title, ASIN or EAN."
                : "Every mapped catalog item is in stock."}
            </p>
          </div>
        ) : (
          <>
            <div
              className={`divide-y divide-gray-100 transition-opacity ${
                isFetching ? "opacity-60" : ""
              }`}
            >
              {alerts.map((record) => (
                <LowStockRow
                  key={record.id || record.asin}
                  record={record}
                  onResync={handleResync}
                  onDismiss={handleDismiss}
                  resyncing={resyncingAsin === record.asin}
                />
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <Pagination
                current={page}
                total={totalPages}
                onChange={setPage}
                pageSize={limit}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                totalItems={matched}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LowStockAlerts;
