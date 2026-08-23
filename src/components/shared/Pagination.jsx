import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Build a compact page list: 1 … (c-1) c (c+1) … last
const buildPages = (current, total) => {
  const pages = [];
  const push = (v) => pages.push(v);

  if (total <= 7) {
    for (let i = 1; i <= total; i++) push(i);
    return pages;
  }

  push(1);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) push("…l");
  for (let i = start; i <= end; i++) push(i);
  if (end < total - 1) push("…r");

  push(total);
  return pages;
};

const Pagination = ({
  current,
  currentPage,
  total,
  totalPages,
  onChange,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  totalItems,
}) => {
  const activeCurrent = Number(current ?? currentPage ?? 1);
  const activeTotal = Math.max(1, Number(total ?? totalPages ?? 1));
  const handleChange = onChange ?? onPageChange;

  const pages = buildPages(activeCurrent, activeTotal);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
      {/* Page-size selector + range summary */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-gray-200 px-2.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-brand cursor-pointer font-medium shadow-xs"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {typeof totalItems === "number" && totalItems > 0 && pageSize && (
            <span className="ml-1 text-gray-400 font-normal">
              · {(activeCurrent - 1) * pageSize + 1}–
              {Math.min(activeCurrent * pageSize, totalItems)} of {totalItems} items
            </span>
          )}
        </div>
      )}

      {/* Page Numbers and Navigation */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap ml-auto">
        <button
          onClick={() => activeCurrent > 1 && handleChange?.(activeCurrent - 1)}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          disabled={activeCurrent <= 1}
          title="Previous Page"
        >
          <FiChevronLeft size={16} />
        </button>

        {pages.map((p, idx) =>
          typeof p === "string" ? (
            <span
              key={`${p}-${idx}`}
              className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => handleChange?.(p)}
              className={`min-w-8 h-8 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                p === activeCurrent
                  ? "bg-brand text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => activeCurrent < activeTotal && handleChange?.(activeCurrent + 1)}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          disabled={activeCurrent >= activeTotal}
          title="Next Page"
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
