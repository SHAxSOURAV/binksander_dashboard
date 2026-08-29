import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/**
 * Compact page list with a fixed-width window around the current page:
 *   page 24 of 52  →  1 … 22 23 [24] 25 26 … 52
 *
 * `siblings` is how many pages sit either side of the current one. The window is
 * clamped so it keeps the same width at both ends of the range (page 2 of 52 still
 * shows five numbered pages), which stops the control from resizing as you page
 * through and keeps every table on the dashboard the same width.
 */
const buildPages = (current, total, siblings = 2) => {
  const windowSize = siblings * 2 + 1;
  // 2 ends + 2 ellipses + the window; below this everything fits without gaps.
  const maxVisible = windowSize + 4;

  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let start = Math.max(2, current - siblings);
  let end = Math.min(total - 1, current + siblings);

  // Keep the window a constant width when the current page is near either end.
  const deficit = windowSize - (end - start + 1);
  if (deficit > 0) {
    if (start === 2) end = Math.min(total - 1, end + deficit);
    else if (end === total - 1) start = Math.max(2, start - deficit);
  }

  const pages = [1];
  if (start > 2) pages.push("gap-left");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("gap-right");
  pages.push(total);

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
  siblings = 2,
  className = "",
}) => {
  const activeCurrent = Number(current ?? currentPage ?? 1);
  const activeTotal = Math.max(1, Number(total ?? totalPages ?? 1));
  const handleChange = onChange ?? onPageChange;

  const go = (page) => {
    const next = Math.min(activeTotal, Math.max(1, page));
    if (next !== activeCurrent) handleChange?.(next);
  };

  if (activeTotal <= 1 && !onPageSizeChange) return null;

  const pages = buildPages(activeCurrent, activeTotal, siblings);

  const navBtn =
    "w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 " +
    "hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 " +
    "disabled:hover:bg-transparent disabled:hover:border-gray-200 disabled:cursor-not-allowed transition-colors";

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 w-full ${className}`}
    >
      {/* Page size + range summary */}
      {(onPageSizeChange || typeof totalItems === "number") && (
        <div className="flex items-center gap-2 text-xs text-gray-500 order-2 sm:order-1">
          {onPageSizeChange && (
            <>
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-8 rounded-md border border-gray-200 px-2 text-xs text-gray-700 bg-white focus:outline-none focus:border-gray-400 cursor-pointer font-medium"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </>
          )}
          {typeof totalItems === "number" && totalItems > 0 && pageSize > 0 && (
            <span className="text-gray-400">
              {(activeCurrent - 1) * pageSize + 1}–
              {Math.min(activeCurrent * pageSize, totalItems)} of{" "}
              {totalItems.toLocaleString()}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 order-1 sm:order-2 sm:ml-auto">
        <button
          onClick={() => go(activeCurrent - 1)}
          className={navBtn}
          disabled={activeCurrent <= 1}
          aria-label="Previous page"
        >
          <FiChevronLeft size={15} />
        </button>

        {pages.map((p) =>
          typeof p === "string" ? (
            <span
              key={p}
              className="w-7 h-8 flex items-end justify-center text-gray-300 text-xs pb-1.5 select-none"
            >
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => go(p)}
              aria-current={p === activeCurrent ? "page" : undefined}
              className={`min-w-8 h-8 px-2 rounded-md text-xs font-semibold transition-colors ${
                p === activeCurrent
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => go(activeCurrent + 1)}
          className={navBtn}
          disabled={activeCurrent >= activeTotal}
          aria-label="Next page"
        >
          <FiChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
