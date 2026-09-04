import React, { useState, useEffect } from "react";
import { Empty, Checkbox, message, Tooltip, Button, Select, Input, Modal } from "antd";
import { 
  FiAlertCircle, FiCopy, FiExternalLink, FiCheck, 
  FiCheckCircle, FiSearch, FiTrash2 
} from "react-icons/fi";
import { LuRefreshCw, LuShieldCheck } from "react-icons/lu";
import { BsGrid, BsListUl } from "react-icons/bs";
import { 
  useGetNeedsReviewItemsQuery, 
  useDeleteNeedsReviewItemMutation,
  useDeleteNeedsReviewBulkMutation,
  useRevalidateItemMutation, 
  useRevalidateInventoryItemsMutation,
  useSyncConnectedSheetMutation,
  useForcePassItemMutation,
  useForcePassBulkMutation,
  useGetFiltersMetaQuery
} from "../../Redux/productApis";
import Pagination from "../../components/shared/Pagination";
import ValidationFailureModal from "../../components/needsReview/ValidationFailureModal";
import SpreadsheetSelector from "../../components/shared/SpreadsheetSelector";
import { useUI } from "../../Provider/ContextProvider";

import { getSafeAmazonUrl } from "../../utils/urlUtils";

const NeedsReview = () => {
  const { selectedSpreadsheetUrl } = useUI();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filterBrand, setFilterBrand] = useState(null);
  const [filterReason, setFilterReason] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [view, setView] = useState("list");

  // Modal states for delete confirmation
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useGetNeedsReviewItemsQuery(
    {
      page,
      limit,
      filter_brand: filterBrand,
      filter_reason: filterReason,
      search: debouncedSearch,
      spreadsheet_url: selectedSpreadsheetUrl !== "all" ? selectedSpreadsheetUrl : undefined,
    },
    { pollingInterval: 30000 }
  );
  const { data: filtersMeta } = useGetFiltersMetaQuery(
    selectedSpreadsheetUrl !== "all" ? { spreadsheet_url: selectedSpreadsheetUrl } : undefined
  );
  const [revalidateItem] = useRevalidateItemMutation();
  const [revalidateInventoryItems, { isLoading: isRevalidatingBulk }] = useRevalidateInventoryItemsMutation();
  const [deleteItem, { isLoading: isDeletingSingle }] = useDeleteNeedsReviewItemMutation();
  const [deleteBulk, { isLoading: isDeletingBulk }] = useDeleteNeedsReviewBulkMutation();
  const [syncConnectedSheet, { isLoading: isSyncingSheet }] = useSyncConnectedSheetMutation();
  const [forcePassItem] = useForcePassItemMutation();
  const [forcePassBulk, { isLoading: isForcePassingBulk }] = useForcePassBulkMutation();

  const handleRevalidateItem = async (id) => {
    try {
      await revalidateItem(id).unwrap();
      message.success("Item queued for re-validation!");
    } catch (err) {
      message.error("Failed to revalidate item");
    }
  };

  const handleRevalidateBulk = async () => {
    if (!selectedRowKeys.length) return;
    try {
      const res = await revalidateInventoryItems({ item_ids: selectedRowKeys }).unwrap();
      message.success(res.message || `Started re-validation for ${selectedRowKeys.length} product(s)!`);
      setSelectedRowKeys([]);
    } catch (err) {
      message.error(err?.data?.detail || "Failed to revalidate selected items");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!id) return;
    try {
      await deleteItem(id).unwrap();
      message.success("Item deleted from Needs Review");
      setSelectedRowKeys((prev) => prev.filter((k) => k !== id));
      setItemToDelete(null);
    } catch (err) {
      message.error(err?.data?.detail || "Failed to delete item");
    }
  };

  const handleDeleteBulk = async () => {
    if (!selectedRowKeys.length) return;
    try {
      const res = await deleteBulk(selectedRowKeys).unwrap();
      message.success(res.message || `Deleted ${selectedRowKeys.length} product(s)`);
      setSelectedRowKeys([]);
      setIsBulkDeleteOpen(false);
    } catch (err) {
      message.error(err?.data?.detail || "Failed to delete selected products");
    }
  };

  const handleSyncSpreadsheet = async () => {
    try {
      const res = await syncConnectedSheet().unwrap();
      if (res.success) {
        message.success(res.message || "Spreadsheet synced! Checked for new products.");
      } else {
        message.info(res.message || "No new products found.");
      }
    } catch (err) {
      message.error("Failed to sync spreadsheet");
    }
  };

  const handleForcePassItem = async (id) => {
    try {
      await forcePassItem(id).unwrap();
      message.success("Product forcibly approved and added to catalog!");
    } catch (err) {
      message.error("Failed to approve product");
    }
  };

  const handleForcePassBulk = async () => {
    if (!selectedRowKeys.length) return;
    try {
      const res = await forcePassBulk(selectedRowKeys).unwrap();
      message.success(res.message || `Forcibly approved ${selectedRowKeys.length} product(s)!`);
      setSelectedRowKeys([]);
    } catch (err) {
      message.error("Failed to approve selected products");
    }
  };

  const handleCopy = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {
      // Unavailable over plain HTTP (e.g. reaching the dashboard on a LAN IP).
      const ta = document.createElement("textarea");
      ta.value = String(text);
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        message.error("Could not copy");
        return;
      } finally {
        document.body.removeChild(ta);
      }
    }
    message.success(`Copied: ${text}`);
  };

  const getTitle = (r) =>
    r["PRODUCT TITLE"] || r["Product Title"] || r["product title"] ||
    r.TITLE || r.Title || r.title || r.product_title || "No title";

  const CHECK_LABELS = {
    bolcom_duplicate_ean: "Duplicate EAN",
    bolcom_duplicate_brand: "Duplicate Brand",
    amazon_low_rating: "Low Rating",
  };

  const formatReason = (text) => {
    if (!text) return "Validation failed";
    if (text.includes("Rating") || text.includes("3.5")) return text;
    if (text.includes("EAN")) return "EAN already listed";
    if (text.includes("Brand")) return "Brand already listed";
    if (text.includes("API call failed") || text.includes("credentials")) return "Bol connection error";
    if (text.includes("Tavily") || text.includes("search")) return "Search service error";
    return text;
  };

  const failingChecks = (r) =>
    Object.entries(r.validation_checks || {}).filter(([, v]) => v !== "pass");

  const toggleRow = (id, checked) =>
    setSelectedRowKeys((prev) => (checked ? [...prev, id] : prev.filter((k) => k !== id)));

  /** Icon-only row actions. Text labels cost a third of the row width. */
  const RowActions = ({ record }) => {
    if (record.validation_status === "PROCESSING") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
          <LuRefreshCw className="animate-spin" size={11} /> Processing
        </span>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <Tooltip title="Re-validate">
          <button
            onClick={(e) => { e.stopPropagation(); handleRevalidateItem(record._id); }}
            aria-label="Re-validate"
            className="w-7 h-7 rounded border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 flex items-center justify-center transition-colors"
          >
            <LuRefreshCw size={12} />
          </button>
        </Tooltip>
        <Tooltip title="Approve & move to catalog">
          <button
            onClick={(e) => { e.stopPropagation(); handleForcePassItem(record._id); }}
            aria-label="Approve and move to catalog"
            className="w-7 h-7 rounded border border-gray-300 text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 flex items-center justify-center transition-colors"
          >
            <FiCheck size={13} />
          </button>
        </Tooltip>
        <Tooltip title="Remove from Needs Review">
          <button
            onClick={(e) => { e.stopPropagation(); setItemToDelete(record); }}
            aria-label="Remove from Needs Review"
            className="w-7 h-7 rounded border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-colors"
          >
            <FiTrash2 size={12} />
          </button>
        </Tooltip>
      </div>
    );
  };

  /** Small neutral chip per failing check; click opens the failure detail. */
  const CheckChips = ({ record, className = "" }) => (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {failingChecks(record).map(([key, val]) => (
        <button
          key={key}
          onClick={(e) => { e.stopPropagation(); setSelectedFailure({ record, checkKey: key }); }}
          title="View failure details"
          className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold transition-colors ${
            val === "fail"
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-amber-200 text-amber-700 hover:bg-amber-50"
          }`}
        >
          {CHECK_LABELS[key] || key}
        </button>
      ))}
    </div>
  );

  const rawItems = data?.items || [];
  const items = [...rawItems].sort(
    (a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0)
  );
  const totalPages = data?.total_pages || 0;
  const totalItems = data?.total || 0;

  const brandOptions = [
    { value: "all", label: "All Brands" },
    ...(filtersMeta?.brands || []).map((b) => ({ value: b, label: b }))
  ];

  return (
    <div className="bg-gray-50/50 flex-grow min-h-screen pb-24 relative">
      <div className="bg-white rounded-lg p-4 card-shadow">
        {/* Header — same shape as Inventory Catalog */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
              <FiAlertCircle size={16} />
            </div>
            <div className="leading-none">
              <h2 className="text-[22px] font-semibold text-gray-900 tracking-tight tabular-nums">
                {totalItems.toLocaleString()}
                <span className="text-[13px] font-medium text-gray-400 ml-1.5">
                  Needs Review
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-1">
                Products held back by a validation check
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SpreadsheetSelector onSelectChange={() => setPage(1)} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<FiSearch className="text-gray-400 mr-1" />}
              placeholder="Search EAN, title or ASIN"
              allowClear
              className="h-9 w-full sm:w-56"
            />

            <button
              onClick={handleSyncSpreadsheet}
              disabled={isSyncingSheet}
              title="Sync from spreadsheet"
              className="w-9 h-9 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <LuRefreshCw size={16} className={isSyncingSheet ? "animate-spin" : ""} />
            </button>

            <Select
              value={filterBrand || "all"}
              onChange={(val) => { setFilterBrand(val === "all" ? null : val); setPage(1); }}
              className="w-36 h-9 custom-select"
              options={brandOptions}
            />

            <Select
              value={filterReason || "all"}
              onChange={(val) => { setFilterReason(val === "all" ? null : val); setPage(1); }}
              className="w-40 h-9 custom-select"
              options={[
                { value: "all", label: "All reasons" },
                { value: "Already on bol.com (EAN)", label: "Duplicate EAN" },
                { value: "Already on bol.com (Brand)", label: "Duplicate Brand" },
                { value: "Low Amazon Rating", label: "Low Rating" },
                { value: "Bol Connection Error", label: "Bol Connection Error" },
                { value: "search error", label: "Search Service Error" },
              ]}
            />

            <div className="flex bg-gray-100 rounded p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${view === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
              >
                <BsGrid size={15} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
              >
                <BsListUl size={16} />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className={view === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
            : "space-y-2"}>
            {Array.from({ length: view === "grid" ? 12 : 8 }).map((_, i) => (
              <div key={i} className={`bg-gray-100 rounded animate-pulse ${view === "grid" ? "h-64" : "h-14"}`} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16">
            <Empty description="No products need review right now." />
          </div>
        ) : view === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {items.map((record) => {
              const ean = record.EAN || record.ean;
              const code = ean || record.asin;
              const safeUrl = getSafeAmazonUrl(record.supplier_link, record.asin, record.country);
              const checked = selectedRowKeys.includes(record._id);
              return (
                <div
                  key={record._id}
                  className="bg-white rounded-md border border-gray-200 p-2.5 hover:border-gray-400 transition-colors flex flex-col"
                >
                  <div className="bg-gray-50 rounded h-24 flex items-center justify-center mb-2 overflow-hidden relative w-full">
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <Checkbox
                        checked={checked}
                        onChange={(e) => toggleRow(record._id, e.target.checked)}
                        className="bg-white/90 rounded backdrop-blur-sm"
                      />
                    </div>
                    {record.product_photo ? (
                      <img src={record.product_photo} alt={getTitle(record)} className="h-[86%] w-[86%] object-contain" />
                    ) : (
                      <span className="text-gray-300 text-xs">No image</span>
                    )}
                  </div>

                  <p className="text-[12px] font-medium text-gray-900 line-clamp-2 leading-snug mb-1 min-h-[2.2em]">
                    {getTitle(record)}
                  </p>

                  {record.product_brand && (
                    <div className="mb-1.5">
                      <span className="inline-flex px-1.5 py-0.5 border border-gray-200 text-gray-600 rounded text-[9px] font-semibold uppercase tracking-wide truncate max-w-full">
                        {record.product_brand}
                      </span>
                    </div>
                  )}

                  <CheckChips record={record} className="mb-1.5" />

                  {(record.validation_reasons || []).slice(0, 1).map((reason, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedFailure({ record, checkKey: null })}
                      className="text-left text-[10px] text-gray-500 hover:text-gray-900 line-clamp-2 mb-1.5 transition-colors"
                    >
                      {formatReason(reason)}
                    </button>
                  ))}

                  <div className="flex items-center justify-between gap-1 mt-auto pt-2 border-t border-gray-100">
                    {code ? (
                      <button
                        onClick={() => handleCopy(code)}
                        title={`Copy ${ean ? "EAN" : "ASIN"}`}
                        className="flex items-center gap-1 px-1 py-0.5 rounded group/copy border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-[9px] font-semibold text-gray-400">{ean ? "EAN" : "ASIN"}</span>
                        <span className="text-[10px] text-gray-700 font-mono truncate max-w-[70px]">{code}</span>
                        <FiCopy size={9} className="text-gray-300 group-hover/copy:text-gray-900 transition-colors" />
                      </button>
                    ) : <span />}
                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="View on Amazon"
                        className="text-gray-300 hover:text-gray-900 transition-colors"
                      >
                        <FiExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  <div className="flex justify-end mt-1.5">
                    <RowActions record={record} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400">
                  <th className="py-2 px-2 w-8">
                    <Checkbox
                      checked={items.length > 0 && selectedRowKeys.length === items.length}
                      indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < items.length}
                      onChange={(e) => setSelectedRowKeys(e.target.checked ? items.map((i) => i._id) : [])}
                    />
                  </th>
                  <th className="py-2 px-2 w-12" />
                  <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider">Product</th>
                  <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider w-40">EAN</th>
                  <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider w-40">Failing checks</th>
                  <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider">Reason</th>
                  <th className="py-2 px-2 text-right text-[10px] font-semibold uppercase tracking-wider w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((record) => {
                  const ean = record.EAN || record.ean;
                  const safeUrl = getSafeAmazonUrl(record.supplier_link, record.asin, record.country);
                  return (
                    <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-2">
                        <Checkbox
                          checked={selectedRowKeys.includes(record._id)}
                          onChange={(e) => toggleRow(record._id, e.target.checked)}
                        />
                      </td>

                      <td className="py-2 px-2">
                        {record.product_photo ? (
                          <img
                            src={record.product_photo}
                            alt={getTitle(record)}
                            className="w-9 h-9 object-contain rounded border border-gray-200 bg-white"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-[9px]">—</div>
                        )}
                      </td>

                      <td className="py-2 px-2">
                        <p className="text-[12px] font-medium text-gray-900 line-clamp-1">{getTitle(record)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {record.product_brand && (
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[120px]">
                              {record.product_brand}
                            </span>
                          )}
                          {safeUrl && (
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-900 transition-colors"
                            >
                              Source <FiExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-2 text-gray-600">
                        {ean ? (
                          <button
                            onClick={() => handleCopy(ean)}
                            title="Copy EAN"
                            className="group/copy inline-flex items-center gap-1.5 text-[11px] font-mono hover:text-gray-900 transition-colors"
                          >
                            {ean}
                            <FiCopy size={10} className="text-gray-300 group-hover/copy:text-gray-900 transition-colors" />
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      <td className="py-2 px-2">
                        <CheckChips record={record} />
                      </td>

                      <td className="py-2 px-2">
                        {(record.validation_reasons || []).map((reason, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedFailure({ record, checkKey: null })}
                            className="block text-left text-[11px] text-gray-500 hover:text-gray-900 transition-colors"
                          >
                            {formatReason(reason)}
                          </button>
                        ))}
                      </td>

                      <td className="py-2 px-2">
                        <div className="flex justify-end">
                          <RowActions record={record} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalItems > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Pagination
              current={page}
              total={totalPages}
              pageSize={limit}
              onChange={setPage}
              onPageSizeChange={setLimit}
              totalItems={totalItems}
            />
          </div>
        )}
      </div>

      {/* Sticky Bulk Action Bar (bottom-middle floating) */}
      {selectedRowKeys.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-2.5 rounded-md shadow-lg border border-gray-200 flex items-center gap-4 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gray-900 text-white flex items-center justify-center font-semibold text-[11px] tabular-nums">
              {selectedRowKeys.length}
            </div>
            <span className="text-[12px] font-medium text-gray-600">selected</span>
          </div>
          <div className="h-5 w-px bg-gray-200"></div>
          <div className="flex items-center gap-1.5">
            <Button onClick={() => setSelectedRowKeys([])} type="text" className="text-gray-500 hover:text-gray-800 cursor-pointer">
              Cancel
            </Button>
            <Button
              type="default"
              disabled={isRevalidatingBulk}
              className="border-gray-200 text-gray-700 hover:text-black font-medium h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
              onClick={handleRevalidateBulk}
            >
              {isRevalidatingBulk ? (
                <LuRefreshCw className="animate-spin" size={13} />
              ) : (
                <LuShieldCheck size={13} />
              )}
              Re-validate ({selectedRowKeys.length})
            </Button>
            <Button
              type="primary"
              loading={isForcePassingBulk}
              className="bg-gray-900 hover:bg-gray-700 h-8 px-3 text-xs font-medium border-0 flex items-center gap-1.5 cursor-pointer text-white"
              onClick={handleForcePassBulk}
            >
              <FiCheckCircle size={13} />
              Approve ({selectedRowKeys.length})
            </Button>
            <Button
              danger
              onClick={() => setIsBulkDeleteOpen(true)}
              className="h-8 px-3 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <FiTrash2 size={13} />
              Delete ({selectedRowKeys.length})
            </Button>
          </div>
        </div>
      )}

      <ValidationFailureModal
          open={!!selectedFailure}
          onClose={() => setSelectedFailure(null)}
          record={selectedFailure?.record}
          checkKey={selectedFailure?.checkKey}
        />

        {/* Single Delete Confirmation Modal */}
        <Modal
          open={!!itemToDelete}
          onCancel={() => setItemToDelete(null)}
          footer={null}
          centered
          width={420}
          className="rounded-md overflow-hidden"
        >
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 size={18} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Product</h3>
            <p className="text-gray-500 text-xs mb-5 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-800">"{itemToDelete?.TITLE || itemToDelete?.Title || itemToDelete?.title || itemToDelete?.product_title || itemToDelete?.asin || "this product"}"</span> from Needs Review? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                className="h-9 px-4 rounded border-gray-200 text-gray-700 text-xs font-medium cursor-pointer"
                onClick={() => setItemToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                danger
                type="primary"
                loading={isDeletingSingle}
                className="h-9 px-4 rounded text-xs font-medium bg-red-600 hover:bg-red-700 border-0 cursor-pointer"
                onClick={() => handleDeleteItem(itemToDelete?._id)}
              >
                Delete Product
              </Button>
            </div>
          </div>
        </Modal>

        {/* Bulk Delete Confirmation Modal */}
        <Modal
          open={isBulkDeleteOpen}
          onCancel={() => setIsBulkDeleteOpen(false)}
          footer={null}
          centered
          width={420}
          className="rounded-md overflow-hidden"
        >
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 size={18} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Selected Products</h3>
            <p className="text-gray-500 text-xs mb-5 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 font-bold">{selectedRowKeys.length}</strong> selected product(s) from Needs Review? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                className="h-9 px-4 rounded border-gray-200 text-gray-700 text-xs font-medium cursor-pointer"
                onClick={() => setIsBulkDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                danger
                type="primary"
                loading={isDeletingBulk}
                className="h-9 px-4 rounded text-xs font-medium bg-red-600 hover:bg-red-700 border-0 cursor-pointer"
                onClick={handleDeleteBulk}
              >
                Delete Selected ({selectedRowKeys.length})
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
};

export default NeedsReview;
