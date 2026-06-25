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
  current = 1,
  total = 1,
  onChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 50, 100],
  totalItems,
}) => {
  // Hide the pager only when there's nothing to navigate AND no size control.
  if (total <= 1 && !onPageSizeChange) return null;

  const pages = buildPages(current, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
      {/* Page-size selector + range summary */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-gray-200 px-2 text-gray-600 focus:outline-none focus:border-brand cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>per page</span>
          {typeof totalItems === "number" && totalItems > 0 && (
            <span className="ml-1">
              · {(current - 1) * pageSize + 1}–
              {Math.min(current * pageSize, totalItems)} of {totalItems}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <button
          onClick={() => current > 1 && onChange?.(current - 1)}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-brand disabled:opacity-40"
          disabled={current === 1}
        >
          <FiChevronLeft size={15} />
        </button>

        {pages.map((p) =>
          typeof p === "string" ? (
            <span
              key={p}
              className="w-8 h-8 flex items-center justify-center text-gray-400"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange?.(p)}
              className={`min-w-8 h-8 px-2 rounded-full text-sm font-medium transition ${
                p === current
                  ? "bg-brand text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => current < total && onChange?.(current + 1)}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-brand disabled:opacity-40"
          disabled={current === total}
        >
          <FiChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
