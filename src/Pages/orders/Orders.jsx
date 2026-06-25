import { useState } from "react";
import { Input, Spin, Empty, Modal } from "antd";
import { FiSearch } from "react-icons/fi";
import Pagination from "../../components/shared/Pagination";
import { useGetBolOrdersQuery } from "../../Redux/analyticsApis";

const LIMIT = 50;

const STATUS_META = {
  OPEN: { label: "Open", color: "#D97706", bg: "#FFF7E6" },
  SHIPPED: { label: "Shipped", color: "#16A34A", bg: "#E9F9F0" },
  CANCELLED: { label: "Cancelled", color: "#DC2626", bg: "#FDECEC" },
  ALL: { label: "—", color: "#6B7280", bg: "#F3F4F6" },
};
const meta = (s) =>
  STATUS_META[s] || { label: s || "—", color: "#6B7280", bg: "#F3F4F6" };

const Orders = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isFetching, isError } = useGetBolOrdersQuery({
    page,
    limit: LIMIT,
  });

  const orders = data?.orders || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, data?.total_pages || 1);

  const rows = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.productTitle || "").toLowerCase().includes(q) ||
      (o.orderId || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl p-5 card-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Orders</h2>
          <p className="text-xs text-gray-400">{total} Bol.com order(s)</p>
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
          <Spin tip="Loading orders..." />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16">
          <Empty
            description={
              isError
                ? "Couldn't reach the server. Is the backend running?"
                : "No orders yet. Use Sync on the Dashboard to pull orders from Bol.com."
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 bg-[#f9fafc] [&>th]:font-medium">
                <th className="py-3 px-2">Order ID</th>
                <th className="py-3 px-2">Product</th>
                <th className="py-3 px-2">Items</th>
                <th className="py-3 px-2">Revenue</th>
                <th className="py-3 px-2">Net Income</th>
                <th className="py-3 px-2">Order Time</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const m = meta(o.status);
                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="py-3 px-2 text-gray-500">{o.orderId}</td>
                    <td className="py-3 px-2 text-gray-700 line-clamp-1 max-w-[200px]">
                      {o.productTitle}
                    </td>
                    <td className="py-3 px-2 text-gray-500">{o.itemCount}</td>
                    <td className="py-3 px-2 text-gray-700">€{o.totalRevenue}</td>
                    <td
                      className={`py-3 px-2 font-medium ${
                        o.totalNetIncome >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      €{o.totalNetIncome}
                    </td>
                    <td className="py-3 px-2 text-gray-500">
                      {(o.orderPlacedDateTime || "").slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="inline-block text-[11px] font-semibold px-3 py-1 rounded-full"
                        style={{ color: m.color, backgroundColor: m.bg }}
                      >
                        {m.label}
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

      {/* Order detail */}
      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        centered
        width={560}
      >
        {selected && (
          <div className="font-poppins pt-2">
            <div className="flex items-center justify-between pr-6 mb-1">
              <h2 className="text-base font-bold text-brand">
                Order <span className="text-gray-700">{selected.orderId}</span>
              </h2>
              <span
                className="text-[11px] font-semibold px-3 py-1 rounded-full"
                style={{ color: meta(selected.status).color, backgroundColor: meta(selected.status).bg }}
              >
                {meta(selected.status).label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {(selected.orderPlacedDateTime || "").slice(0, 19).replace("T", " ")}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Stat label="Revenue" value={`€${selected.totalRevenue}`} />
              <Stat
                label="Net Income"
                value={`€${selected.totalNetIncome}`}
                positive={selected.totalNetIncome >= 0}
              />
            </div>

            <p className="text-xs font-semibold text-gray-500 mb-2">Items</p>
            <div className="space-y-2">
              {(selected.items || []).map((it, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-[#f7f8fc] rounded-lg px-3 py-2 text-xs"
                >
                  <span className="text-gray-700 truncate max-w-[260px]">
                    {it.product?.title || it.ean || "Item"}
                  </span>
                  <span className="text-gray-500">
                    {it.quantity || 1} × €{it.offerPrice ?? it.unitPrice ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const Stat = ({ label, value, positive }) => (
  <div className="bg-[#f7f8fc] rounded-xl px-4 py-3">
    <p className="text-xs text-gray-400">{label}</p>
    <p
      className={`text-base font-bold ${
        positive === undefined ? "text-gray-800" : positive ? "text-green-600" : "text-red-500"
      }`}
    >
      {value}
    </p>
  </div>
);

export default Orders;
