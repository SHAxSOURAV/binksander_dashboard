import { useState, useMemo, useEffect } from "react";
import { Select } from "antd";
import {
  FiShoppingBag,
  FiDollarSign,
  FiLayers,
  FiInbox,
  FiTrendingUp,
} from "react-icons/fi";
import { useGetSalesAnalysisQuery } from "../../Redux/analyticsApis";
import Pagination from "../shared/Pagination";
import CopyField from "../shared/CopyField";

const PAGE_SIZE = 5;

const RANGE_LABELS = {
  "7d": "last 7 days",
  "14d": "last 14 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "365d": "last 365 days",
};

const euro = (v) =>
  `€${Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Paginated product table shared by both panels. */
const ProductTable = ({ title, subtitle, icon, rows, isLoading, metric }) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-white rounded-lg p-5 card-shadow flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-1">
        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          {icon} {title}
        </h4>
        <span className="text-[11px] text-gray-400">{subtitle}</span>
      </div>

      {isLoading ? (
        <div className="space-y-2 py-3">
          {[...Array(PAGE_SIZE)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-md animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <FiInbox size={26} className="text-gray-300" />
          <p className="text-xs text-gray-400 mt-2">No sales in this period</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 flex-1">
            {visible.map((row, idx) => {
              const rank = (page - 1) * PAGE_SIZE + idx + 1;
              return (
                <div key={row.ean} className="flex items-center gap-3 py-2.5">
                  <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {rank}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-xs line-clamp-1">
                      {row.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <CopyField label="EAN" value={row.ean} />
                      {row.category && (
                        <span className="text-[9px] font-semibold px-1.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                          {row.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-bold ${
                        metric === "revenue" ? "text-green-700" : "text-gray-900"
                      }`}
                    >
                      {metric === "revenue" ? euro(row.total_revenue) : row.units_sold}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {metric === "revenue"
                        ? `${row.units_sold} sold`
                        : euro(row.total_revenue)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 mt-1 border-t border-gray-100">
            <Pagination
              current={page}
              total={totalPages}
              onChange={setPage}
              pageSize={PAGE_SIZE}
              totalItems={rows.length}
            />
          </div>
        </>
      )}
    </div>
  );
};

const SalesAnalysisTab = ({ range }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { data, isLoading } = useGetSalesAnalysisQuery({
    range,
    category: selectedCategory,
  });

  const res = data || {};
  const bestSelling = res.best_selling_items || [];
  const highestRevenue = res.highest_revenue_items || [];
  const categories = useMemo(() => res.categories || [], [res.categories]);

  const categoryOptions = [
    { label: "All product groups", value: "All" },
    ...categories.map((c) => ({ label: c.category, value: c.category })),
  ];

  const totals = useMemo(() => {
    const revenue = categories.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
    const units = categories.reduce((sum, c) => sum + (c.units_sold || 0), 0);
    return { revenue, units, groups: categories.length };
  }, [categories]);

  return (
    <div className="space-y-5">
      {/* Filter header */}
      <div className="bg-white rounded-lg p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200">
            <FiLayers size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Sales by Product Group</h3>
            <p className="text-xs text-gray-400">
              Based on synced Bol orders from the {RANGE_LABELS[range] || range}
            </p>
          </div>
        </div>

        <div className="w-full md:w-72">
          <label className="text-[11px] font-semibold text-gray-500 block mb-1">
            Filter by product group
          </label>
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryOptions}
            className="w-full h-10"
          />
        </div>
      </div>

      {/* Period totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Revenue",
            value: euro(totals.revenue),
            icon: <FiDollarSign size={16} />,
          },
          {
            label: "Units Sold",
            value: totals.units.toLocaleString(),
            icon: <FiShoppingBag size={16} />,
          },
          {
            label: "Product Groups",
            value: totals.groups.toLocaleString(),
            icon: <FiLayers size={16} />,
          },
        ].map((t) => (
          <div
            key={t.label}
            className="bg-white rounded-lg p-4 card-shadow border border-gray-100 flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                {t.label}
              </p>
              <p className="text-xl font-black text-gray-900 mt-1">{t.value}</p>
            </div>
            <div className="w-9 h-9 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200">
              {t.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Top product groups */}
      {categories.length > 0 && (
        <div className="bg-white rounded-lg p-5 card-shadow">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <FiTrendingUp className="text-gray-500" size={15} /> Top Product Groups
            </h4>
            <span className="text-[11px] text-gray-400">By revenue</span>
          </div>
          <div className="space-y-2.5">
            {categories.slice(0, 5).map((cat, idx) => {
              const pct = totals.revenue
                ? Math.round((cat.total_revenue / totals.revenue) * 100)
                : 0;
              return (
                <div key={cat.category || idx} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-700 w-40 truncate shrink-0">
                    {cat.category}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-800 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-24 text-right shrink-0">
                    {euro(cat.total_revenue)}
                  </span>
                  <span className="text-[10px] text-gray-400 w-14 text-right shrink-0">
                    {cat.units_sold} units
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Item tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ProductTable
          title="Best Selling Items"
          subtitle="By units sold"
          icon={<FiShoppingBag className="text-gray-500" size={15} />}
          rows={bestSelling}
          isLoading={isLoading}
          metric="units"
        />
        <ProductTable
          title="Highest Revenue per Item"
          subtitle="By total revenue"
          icon={<FiDollarSign className="text-gray-500" size={15} />}
          rows={highestRevenue}
          isLoading={isLoading}
          metric="revenue"
        />
      </div>
    </div>
  );
};

export default SalesAnalysisTab;
