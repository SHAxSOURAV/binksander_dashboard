import { useState } from "react";
import { Input, Spin, Empty } from "antd";
import { FiSearch } from "react-icons/fi";
import FulfillmentDetailModal from "../../components/operations/FulfillmentDetailModal";
import Pagination from "../../components/shared/Pagination";
import { statusMeta } from "../../utils/fulfillmentStatus";
import { useGetFulfillmentOrdersQuery } from "../../Redux/fulfillmentApis";

const LIMIT = 50;

// Rimco = the delivery/logistics view of fulfilled orders (post-purchase phase).
const DELIVERY_STATUSES = ["purchasing", "purchased", "shipped", "completed"];

const RimcoOperations = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isFetching, isError } = useGetFulfillmentOrdersQuery({
    page,
    limit: LIMIT,
  });

  const all = data?.orders || [];
  const rows = all
    .filter((o) => DELIVERY_STATUSES.includes(o.status))
    .filter((o) => {
      const q = search.toLowerCase();
      return (
        (o.title || "").toLowerCase().includes(q) ||
        (o.bol_order_id || "").toLowerCase().includes(q) ||
        (o.ship_to?.name || "").toLowerCase().includes(q)
      );
    });

  const totalPages = Math.max(1, data?.total_pages || 1);

  return (
    <div className="bg-white rounded-2xl p-5 card-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Rimco Operations</h2>
          <p className="text-xs text-gray-400">Delivery tracking for fulfilled orders</p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefix={<FiSearch className="text-gray-400 mr-1" />}
          placeholder="Search"
          className="h-10 rounded-lg w-full sm:w-72"
        />
      </div>

      {isLoading || isFetching ? (
        <div className="py-20 flex justify-center">
          <Spin tip="Loading..." />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16">
          <Empty
            description={
              isError
                ? "Couldn't reach the server. Is the backend running?"
                : "No orders in delivery yet. Approved purchases appear here once placed."
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 bg-[#f9fafc] [&>th]:font-medium">
                <th className="py-3 px-2">Rimco Order ID</th>
                <th className="py-3 px-2">Product Name</th>
                <th className="py-3 px-2">Price</th>
                <th className="py-3 px-2">Customer Name</th>
                <th className="py-3 px-2">Order Time</th>
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
                    <td className="py-3 px-2 text-gray-600">
                      {o.bol_price != null ? `€${o.bol_price}` : "—"}
                    </td>
                    <td className="py-3 px-2 text-gray-700">{o.ship_to?.name || "—"}</td>
                    <td className="py-3 px-2 text-gray-500">
                      {(o.created_at || "").slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="inline-block text-[11px] font-semibold px-3 py-1 rounded-full"
                        style={{ color: meta.color, backgroundColor: meta.bg }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => setSelected(o)}
                        className="bg-brand text-white text-xs px-5 py-1.5 rounded-full"
                      >
                        Open
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
        source="rimco"
      />
    </div>
  );
};

export default RimcoOperations;
