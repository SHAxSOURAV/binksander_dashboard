import { useState } from "react";
import { Input, Spin, Empty } from "antd";
import { FiSearch } from "react-icons/fi";
import { LuRefreshCw } from "react-icons/lu";
import toast from "react-hot-toast";
import FulfillmentDetailModal from "../../components/operations/FulfillmentDetailModal";
import Pagination from "../../components/shared/Pagination";
import { statusMeta, canApprove } from "../../utils/fulfillmentStatus";
import {
  useGetFulfillmentOrdersQuery,
  useSyncFulfillmentMutation,
} from "../../Redux/fulfillmentApis";

const LIMIT = 50;

const AmazonOperations = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isFetching, isError } = useGetFulfillmentOrdersQuery({
    page,
    limit: LIMIT,
  });
  const [sync, { isLoading: syncing }] = useSyncFulfillmentMutation();

  const orders = data?.orders || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, data?.total_pages || 1);

  const rows = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.title || "").toLowerCase().includes(q) ||
      (o.bol_order_id || "").toLowerCase().includes(q) ||
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

  return (
    <div className="bg-white rounded-2xl p-5 card-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Amazon Operations</h2>
          <p className="text-xs text-gray-400">
            Bol.com orders fulfilled via amazon.nl — {total} order(s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<FiSearch className="text-gray-400 mr-1" />}
            placeholder="Search"
            className="h-10 rounded-lg w-full sm:w-64"
          />
          <button
            onClick={handleSync}
            disabled={syncing}
            className="button-color h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <LuRefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            Sync
          </button>
        </div>
      </div>

      {isLoading || isFetching ? (
        <div className="py-20 flex justify-center">
          <Spin tip="Loading orders..." />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16">
          <Empty
            description={
              isError
                ? "Couldn't reach the server. Is the backend running?"
                : "No fulfillment orders yet. They appear here when customers buy on Bol.com."
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 bg-[#f9fafc] [&>th]:font-medium">
                <th className="py-3 px-2">Bol Order ID</th>
                <th className="py-3 px-2">Product</th>
                <th className="py-3 px-2">ASIN</th>
                <th className="py-3 px-2">Customer</th>
                <th className="py-3 px-2">Price</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const meta = statusMeta(o.status);
                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="py-3 px-2 text-gray-500">{o.bol_order_id}</td>
                    <td className="py-3 px-2 text-gray-700 line-clamp-1 max-w-[200px]">
                      {o.title || "—"}
                    </td>
                    <td className="py-3 px-2 text-gray-500">{o.asin || "—"}</td>
                    <td className="py-3 px-2 text-gray-700">{o.ship_to?.name || "—"}</td>
                    <td className="py-3 px-2 text-gray-600">
                      {o.bol_price != null ? `€${o.bol_price}` : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="inline-block text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                        style={{ color: meta.color, backgroundColor: meta.bg }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => setSelected(o)}
                        className={`text-xs px-5 py-1.5 rounded-full ${
                          canApprove(o.status)
                            ? "bg-gray-900 text-white hover:bg-black"
                            : "bg-brand text-white"
                        }`}
                      >
                        {canApprove(o.status) ? "Review" : "Open"}
                      </button>
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
