import { useState } from "react";
import { Input, Spin, Empty } from "antd";
import { FiSearch, FiExternalLink, FiCheckCircle } from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import toast from "react-hot-toast";
import FulfillmentDetailModal from "../../components/operations/FulfillmentDetailModal";
import Pagination from "../../components/shared/Pagination";
import { useUI } from "../../Provider/ContextProvider";
import {
  useGetFulfillmentOrdersQuery,
  useSyncFulfillmentMutation,
  useCompleteFulfillmentOrderMutation,
} from "../../Redux/fulfillmentApis";

const LIMIT = 20;

const AmazonOperations = () => {
  const { activeBolAccountId } = useUI();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [visitedBuyNow, setVisitedBuyNow] = useState({});

  const { data, isLoading, isFetching, isError } = useGetFulfillmentOrdersQuery({
    page,
    limit: LIMIT,
    status: statusFilter,
    accountId: activeBolAccountId,
  });
  const [sync, { isLoading: syncing }] = useSyncFulfillmentMutation();
  const [completeOrder, { isLoading: completing }] = useCompleteFulfillmentOrderMutation();

  const orders = data?.orders || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, data?.total_pages || 1);

  const rows = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.title || "").toLowerCase().includes(q) ||
      (o.bol_order_id || "").toLowerCase().includes(q) ||
      (o.asin || "").toLowerCase().includes(q) ||
      (o.ship_to?.name || "").toLowerCase().includes(q)
    );
  });

  const handleSync = async () => {
    try {
      const res = await sync().unwrap();
      toast.success(`Synced — ${res?.new_items ?? 0} new item(s)`);
    } catch (err) {
      toast.error(err?.data?.detail || "Sync failed (check Bol credentials)");
    }
  };

  const handleBuyNow = (order) => {
    const url = order.amazon_url || (order.asin ? `https://www.amazon.nl/dp/${order.asin}` : null);
    if (!url) {
      toast.error("No Amazon supplier link available for this item.");
      return;
    }
    setVisitedBuyNow((prev) => ({ ...prev, [order.id]: true }));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleMarkComplete = async (orderId) => {
    try {
      await completeOrder(orderId).unwrap();
      toast.success("Order marked as sourcing complete!");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to mark order complete.");
    }
  };

  const isOrderCompleted = (status) => status === "completed";

  return (
    <div className="bg-white rounded-2xl p-5 card-shadow font-poppins space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Amazon Sourcing</h2>
          <p className="text-xs text-gray-400">
            Sourcing orders for dashboard-published products via Amazon — {total} order(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<FiSearch className="text-gray-400 mr-1" />}
            placeholder="Search by Order ID, ASIN, or Customer"
            className="h-10 rounded-xl w-full sm:w-64"
          />
          <button
            onClick={handleSync}
            disabled={syncing}
            className="button-color h-10 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60 shadow-sm"
          >
            <LuRefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            Sync
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        {[
          { key: "pending", label: "Pending" },
          { key: "completed", label: "Completed" },
          { key: "all", label: "All Orders" },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? "bg-brand text-white shadow-md shadow-brand/20"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table Content */}
      {isLoading || isFetching ? (
        <div className="py-20 flex justify-center">
          <Spin tip="Loading sourcing orders..." />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16">
          <Empty
            description={
              isError
                ? "Couldn't reach the server. Is the backend running?"
                : "No orders found in this view. Sync to check for new orders from Bol.com."
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[950px] text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 bg-[#f9fafc] border-y border-gray-100 [&>th]:font-medium">
                <th className="py-3 px-3">Bol Order ID</th>
                <th className="py-3 px-3">Product Title</th>
                <th className="py-3 px-3">ASIN / EAN</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((o) => {
                const completed = isOrderCompleted(o.status);
                const hasVisited = visitedBuyNow[o.id] || completed;
                const amazonUrl = o.amazon_url || (o.asin ? `https://www.amazon.nl/dp/${o.asin}` : null);

                return (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-xs font-semibold text-gray-700">
                      {o.bol_order_id}
                    </td>
                    <td className="py-3.5 px-3 max-w-[220px]">
                      <p className="text-xs font-semibold text-gray-800 truncate" title={o.title}>
                        {o.title || "Untitled Product"}
                      </p>
                      {o.quantity > 1 && (
                        <span className="text-[10px] text-brand font-bold">Qty: {o.quantity}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="text-xs font-mono font-semibold text-gray-700">{o.asin || "—"}</p>
                      <p className="text-[10px] text-gray-400 font-mono">EAN: {o.ean || "—"}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="text-xs font-semibold text-gray-700">{o.ship_to?.name || "Customer"}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[160px]">
                        {o.ship_to?.city ? `${o.ship_to.city}, ${o.ship_to.country || "NL"}` : "—"}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-gray-700">
                      {o.bol_price != null ? `€${o.bol_price}` : "—"}
                    </td>
                    <td className="py-3.5 px-3">
                      {completed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                          <FiCheckCircle size={12} />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200/60">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Buy Now Button */}
                        <button
                          type="button"
                          onClick={() => handleBuyNow(o)}
                          disabled={!amazonUrl}
                          className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer"
                        >
                          Buy Now <FiExternalLink size={13} />
                        </button>

                        {/* Sourcing Complete Button */}
                        {!completed && (
                          <button
                            type="button"
                            onClick={() => handleMarkComplete(o.id)}
                            disabled={completing}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer border ${
                              hasVisited
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm"
                                : "bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-300"
                            }`}
                          >
                            <FiCheckCircle size={13} />
                            Sourcing Complete
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelected(o)}
                          className="px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <Pagination current={page} total={totalPages} onChange={setPage} />
      )}

      <FulfillmentDetailModal
        open={!!selected}
        order={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

export default AmazonOperations;
