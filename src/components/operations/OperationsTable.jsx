import { useState } from "react";
import { Input } from "antd";
import { FiSearch } from "react-icons/fi";
import StatusPill from "../shared/StatusPill";
import OrderDetailModal from "../orders/OrderDetailModal";
import Pagination from "../shared/Pagination";

/**
 * Shared table for Amazon & Rimco operations.
 * @param {string} title - page heading.
 * @param {string} idLabel - first column header.
 * @param {"amazon"|"rimco"} source - tracking pipeline.
 * @param {Array} data - operation rows.
 */
const OperationsTable = ({ title, idLabel, source, data }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const rows = data.filter((d) =>
    d.customerName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-white rounded-2xl p-5 card-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefix={<FiSearch className="text-gray-400 mr-1" />}
          placeholder="Search"
          className="h-10 rounded-lg w-full sm:w-72"
        />
      </div>

      <div className="overflow-x-auto thin-scrollbar">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 bg-[#f9fafc] [&>th]:font-medium">
              <th className="py-3 px-2">{idLabel}</th>
              <th className="py-3 px-2">Product Name</th>
              <th className="py-3 px-2">Price</th>
              <th className="py-3 px-2">Pay by</th>
              <th className="py-3 px-2">Customer Name</th>
              <th className="py-3 px-2">Order Time</th>
              <th className="py-3 px-2">Status</th>
              <th className="py-3 px-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="py-3 px-2 text-gray-500">{o.id}</td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded bg-[#f7f8fc] flex items-center justify-center">
                      🍿
                    </span>
                    <span className="text-gray-700">{o.productName}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-gray-600">€{o.price.toFixed(2)}</td>
                <td className="py-3 px-2 text-gray-500">{o.payBy}</td>
                <td className="py-3 px-2 text-gray-700">{o.customerName}</td>
                <td className="py-3 px-2 text-gray-500">{o.orderTime}</td>
                <td className="py-3 px-2">
                  <StatusPill status={o.status} />
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
            ))}
          </tbody>
        </table>
      </div>

      <Pagination current={page} total={4} onChange={setPage} />

      <OrderDetailModal
        open={!!selected}
        order={selected}
        onClose={() => setSelected(null)}
        showTracking
        source={source}
        activeStep={2}
      />
    </div>
  );
};

export default OperationsTable;
