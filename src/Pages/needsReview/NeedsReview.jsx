import React, { useState, useEffect } from "react";
import { Empty, Table, Tag, message, Tooltip, Button, Select, Input, Modal } from "antd";
import { 
  FiAlertCircle, FiCopy, FiExternalLink, FiCheck, 
  FiCheckCircle, FiSearch, FiTrash2 
} from "react-icons/fi";
import { LuRefreshCw, LuShieldCheck } from "react-icons/lu";
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

import { getSafeAmazonUrl } from "../../utils/urlUtils";

const NeedsReview = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filterBrand, setFilterBrand] = useState(null);
  const [filterReason, setFilterReason] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

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
    { page, limit, filter_brand: filterBrand, filter_reason: filterReason, search: debouncedSearch },
    { pollingInterval: 30000 }
  );
  const { data: filtersMeta } = useGetFiltersMetaQuery();
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

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success(`Copied: ${text}`);
  };

  const columns = [
    {
      title: "Title / Code",
      key: "title",
      render: (_, record) => {
        const ean = record.EAN || record.ean;
        const asin = record.asin;
        const codeToDisplay = ean || asin;
        const codeLabel = ean ? "EAN" : "ASIN";
        const title = record["PRODUCT TITLE"] || record["Product Title"] || record["product title"] || record.TITLE || record.Title || record.title || record.product_title || "No Title";
        const brand = record.product_brand;
        const photo = record.product_photo;
        
        return (
          <div className="flex items-start gap-3">
            {photo && (
              <img 
                src={photo} 
                alt="Product" 
                className="w-10 h-10 rounded-md object-cover border border-gray-100 flex-shrink-0"
              />
            )}
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-1 max-w-[250px] line-clamp-2 leading-snug">{title}</p>
              {brand && (
                <div className="mb-1">
                  <span className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[10px] font-bold">
                    {brand}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono mt-1">
                <span className="font-medium tracking-wide text-[9px] uppercase">{codeLabel}:</span>
                <span>{codeToDisplay || "—"}</span>
                {codeToDisplay && (
                  <Tooltip title="Copy">
                    <button 
                      onClick={() => handleCopy(codeToDisplay)}
                      className="text-gray-400 hover:text-brand transition-colors cursor-pointer"
                    >
                      <FiCopy size={12} />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Supplier Link",
      key: "supplier",
      render: (_, record) => {
        const safeUrl = getSafeAmazonUrl(record.supplier_link, record.asin, record.country);
        return safeUrl ? (
          <a 
            href={safeUrl} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1 text-brand hover:text-brand-dark hover:underline text-sm truncate max-w-[200px]"
          >
            View Source <FiExternalLink size={12} />
          </a>
        ) : <span className="text-gray-400">—</span>;
      },
    },
    {
      title: "Failing Checks",
      key: "checks",
      render: (_, record) => {
        const checks = record.validation_checks || {};
        const labelMap = {
          bolcom_duplicate_ean: "Duplicate EAN",
          bolcom_duplicate_brand: "Duplicate Brand",
          amazon_low_rating: "Low Rating"
        };
        const statusMap = {
          fail: "Failed Check",
          uncertain: "API Failed",
          pass: "Passed"
        };
        return (
          <div className="flex flex-col gap-1">
            {Object.entries(checks).map(([key, val]) => {
              if (val === "pass") return null;
              const color = val === "fail" ? "red" : "orange";
              const label = labelMap[key] || key;
              const statusText = key === "amazon_low_rating" && val === "fail" ? "< 3.5 Stars" : (statusMap[val] || val.toUpperCase());
              return (
                <button
                  key={key}
                  onClick={() => setSelectedFailure({ record, checkKey: key })}
                  className="text-left cursor-pointer transition-transform hover:scale-105"
                  title="Click to view failure details"
                >
                  <Tag color={color} className="w-fit m-0 font-semibold cursor-pointer px-2 py-0.5 text-xs rounded-md">
                    {label}: {statusText}
                  </Tag>
                </button>
              );
            })}
          </div>
        );
      }
    },
    {
      title: "Reasons & Notes",
      key: "reasons",
      render: (_, record) => {
        const formatReason = (text) => {
          if (!text) return "Validation Failed";
          if (text.includes("Rating") || text.includes("3.5")) return text;
          if (text.includes("EAN")) return "EAN Already Listed";
          if (text.includes("Brand")) return "Brand Already Listed";
          if (text.includes("API call failed") || text.includes("credentials")) return "Bol Connection Error";
          if (text.includes("Tavily") || text.includes("search")) return "Search Service Error";
          return text;
        };

        return (
          <div className="flex flex-col gap-1">
            {(record.validation_reasons || []).map((reason, i) => (
              <button
                key={i}
                onClick={() => setSelectedFailure({ record, checkKey: null })}
                className="text-left cursor-pointer hover:underline"
              >
                <p className="text-sm text-red-600 mb-0 flex items-center gap-1 font-medium">
                  <FiAlertCircle size={12} className="shrink-0" /> {formatReason(reason)}
                </p>
              </button>
            ))}
          </div>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_, record) => {
        if (record.validation_status === "PROCESSING") {
          return (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand uppercase tracking-wide">
              <LuRefreshCw className="animate-spin" /> Processing
            </span>
          );
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <button 
              className="text-xs font-semibold px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors cursor-pointer"
              onClick={() => handleRevalidateItem(record._id)}
            >
              Re-validate
            </button>
            <button 
              className="text-xs font-semibold px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              onClick={() => handleForcePassItem(record._id)}
              title="Force validation pass and move to catalog"
            >
              <FiCheck size={13} /> Force Pass
            </button>
            <button 
              className="text-xs font-semibold p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              onClick={() => setItemToDelete(record)}
              title="Delete item"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        );
      },
    }
  ];

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
      <div className="bg-white rounded-2xl p-5 card-shadow">
        {/* Header matching Inventory Catalog */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-lg font-semibold text-gray-700">
            {totalItems} Needs Review
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<FiSearch className="text-gray-400 mr-1" />}
              placeholder="Search"
              className="h-10 rounded-lg w-full sm:w-64"
            />

            <button
              onClick={handleSyncSpreadsheet}
              disabled={isSyncingSheet}
              title="Sync from spreadsheet"
              className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand disabled:opacity-50 cursor-pointer"
            >
              <LuRefreshCw size={16} className={isSyncingSheet ? "animate-spin" : ""} />
            </button>

            <Select
              value={filterBrand || "all"}
              onChange={(val) => {
                setFilterBrand(val === "all" ? null : val);
                setPage(1);
              }}
              className="w-40 h-10 custom-select"
              options={brandOptions}
            />

            <Select
              value={filterReason || "all"}
              onChange={(val) => {
                setFilterReason(val === "all" ? null : val);
                setPage(1);
              }}
              className="w-48 h-10 custom-select"
              options={[
                { value: "all", label: "All Reasons" },
                { value: "Already on bol.com (EAN)", label: "Duplicate EAN" },
                { value: "Already on bol.com (Brand)", label: "Duplicate Brand" },
                { value: "Low Amazon Rating", label: "Low Rating" },
                { value: "Bol Connection Error", label: "Bol Connection Error" },
                { value: "search error", label: "Search Service Error" },
              ]}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Table 
            dataSource={items}
            columns={columns}
            rowKey="_id"
            pagination={false}
            loading={isLoading}
            rowSelection={{
              selectedRowKeys,
              onChange: (newKeys) => setSelectedRowKeys(newKeys)
            }}
            locale={{
              emptyText: <Empty description="No products need review right now." />
            }}
          />
        </div>

        {totalItems > 0 && (
          <div className="mt-6">
            <Pagination
              current={page}
              total={totalPages}
              pageSize={limit}
              onChange={setPage}
              onPageSizeChange={setLimit}
            />
          </div>
        )}
      </div>

      {/* Sticky Bulk Action Bar (bottom-middle floating) */}
      {selectedRowKeys.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-2xl shadow-xl border border-gray-200 flex items-center gap-6 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              {selectedRowKeys.length}
            </div>
            <span className="text-sm font-semibold text-gray-700">Products Selected</span>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setSelectedRowKeys([])} type="text" className="text-gray-500 hover:text-gray-800 cursor-pointer">
              Cancel
            </Button>
            <Button
              type="default"
              disabled={isRevalidatingBulk}
              className="border-gray-300 text-gray-700 hover:text-black font-semibold h-9 px-4 flex items-center gap-1.5 cursor-pointer"
              onClick={handleRevalidateBulk}
            >
              {isRevalidatingBulk ? (
                <LuRefreshCw className="animate-spin text-brand" size={14} />
              ) : (
                <LuShieldCheck className="text-blue-600" size={14} />
              )}
              Re-validate ({selectedRowKeys.length})
            </Button>
            <Button
              type="primary"
              loading={isForcePassingBulk}
              className="bg-green-600 hover:bg-green-700 h-9 px-5 font-semibold border-0 flex items-center gap-1.5 cursor-pointer text-white shadow-sm"
              onClick={handleForcePassBulk}
            >
              <FiCheckCircle size={14} />
              Force Pass ({selectedRowKeys.length})
            </Button>
            <Button
              danger
              onClick={() => setIsBulkDeleteOpen(true)}
              className="h-9 px-4 font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FiTrash2 size={14} />
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
          className="rounded-2xl overflow-hidden"
        >
          <div className="p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Product</h3>
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-800">"{itemToDelete?.TITLE || itemToDelete?.Title || itemToDelete?.title || itemToDelete?.product_title || itemToDelete?.asin || "this product"}"</span> from Needs Review? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                className="h-10 px-5 rounded-lg border-gray-200 text-gray-700 font-medium cursor-pointer"
                onClick={() => setItemToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                danger
                type="primary"
                loading={isDeletingSingle}
                className="h-10 px-5 rounded-lg font-medium bg-red-600 hover:bg-red-700 border-0 cursor-pointer"
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
          className="rounded-2xl overflow-hidden"
        >
          <div className="p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Selected Products</h3>
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 font-bold">{selectedRowKeys.length}</strong> selected product(s) from Needs Review? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                className="h-10 px-5 rounded-lg border-gray-200 text-gray-700 font-medium cursor-pointer"
                onClick={() => setIsBulkDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                danger
                type="primary"
                loading={isDeletingBulk}
                className="h-10 px-5 rounded-lg font-medium bg-red-600 hover:bg-red-700 border-0 cursor-pointer"
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
