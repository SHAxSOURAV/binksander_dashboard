import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input, Empty, Popover, Checkbox, Drawer, Select, Button, Slider, Rate, Tooltip } from "antd";
import { FiSearch, FiPlus, FiLink, FiFilter, FiEye, FiCopy } from "react-icons/fi";
import { BsGrid, BsListUl, BsFileEarmarkSpreadsheet } from "react-icons/bs";
import { FaStar } from "react-icons/fa";
import { LuRefreshCw, LuShieldCheck } from "react-icons/lu";
import ProductDetailsModal from "../../components/products/ProductDetailsModal";
import ConnectInventoryModal from "../../components/products/ConnectInventoryModal";
import DraftEditModal from "../../components/products/DraftEditModal";
import BulkPublishModal from "../../components/products/BulkPublishModal";
import Pagination from "../../components/shared/Pagination";
import { useDispatch } from "react-redux";
import productApis, { 
  useGetProductsQuery,
  useGetFiltersMetaQuery,
  useGetConnectionQuery,
  useSyncConnectedSheetMutation,
  useResyncStockMutation,
  useCreateDraftFromAmazonMutation,
  useGetBolProcessStatusQuery,
  useRevalidateProductsContentMutation,
  useRevalidateInventoryItemsMutation,
} from "../../Redux/productApis";
import toast from "react-hot-toast";
import OfferActionMenu from "../bolListing/components/OfferActionMenu";

const ProcessPoller = ({ processId }) => {
  const dispatch = useDispatch();
  const { data: processStatus } = useGetBolProcessStatusQuery(processId, { pollingInterval: 10000 });
  
  useEffect(() => {
    if (processStatus?.data?.status === 'SUCCESS' || processStatus?.data?.status === 'FAILURE') {
      dispatch(productApis.util.invalidateTags(['Products']));
    }
  }, [processStatus, dispatch]);
  
  return null;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Columns that exist in state but are never offered in the toggle: either handled
// elsewhere (serial/action/status) or retired from the UI (delivery, sheet source).
const HIDDEN_COLUMN_TOGGLES = [
  "serial", "action", "purchasePrice", "status", "delivery", "sheetSource",
];

const DATE_FILTER_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "last_7_days", label: "Last 7 Days" },
  { key: "last_30_days", label: "Last 30 Days" },
];

const Products = () => {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [syncDateRange, setSyncDateRange] = useState("");
  const [page, setPage] = useState(1);
  // Remember the user's chosen page size across sessions.
  const [limit, setLimit] = useState(() => {
    const saved = Number(localStorage.getItem("products:pageSize"));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 100;
  });
  const [selected, setSelected] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const [filters, setFilters] = useState({});
  const [activeFilters, setActiveFilters] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkPublishOpen, setBulkPublishOpen] = useState(false);
  const [stockFilter, setStockFilter] = useState("all");

  const getStockBadgeColor = (p) => {
    const q = p.stockQuantity;
    if (q === 0 || p.stock?.toLowerCase() === "out of stock") {
      return 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200';
    }
    if (q === 1 || q === 2) {
      return 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300';
    }
    if (q == null) {
      return 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200';
    }
    return 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200';
  };

  const [columns, setColumns] = useState({
    serial: false, asin: true, ean: true, title: false, sheetTitle: true, category: true, brand: true,
    purchasePrice: false, price: true, delivery: false,
    sheetSource: false, ratings: false, stock: true, status: false, action: true, publishAction: true
  });

  // Adopt a search term coming from the URL (e.g. the global navbar search).
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  // Debounce the search box and reset to page 1 when the term changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setSelectedProducts([]);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handlePageSizeChange = (size) => {
    setLimit(size);
    setPage(1);
    setSelectedProducts([]);
    localStorage.setItem("products:pageSize", String(size));
  };

  const [pollingInterval, setPollingInterval] = useState(0);
  const [scrapePollCount, setScrapePollCount] = useState(0);

  const titleSource = (!columns.title && columns.sheetTitle) ? "sheet" : "amazon";

  const { data, isLoading, isFetching, isError } = useGetProductsQuery({
    page,
    limit,
    search: debouncedSearch,
    sync_date_range: syncDateRange || undefined,
    title_source: titleSource,
    sortBy,
    sortOrder,
    ...activeFilters
  }, {
    pollingInterval
  });

  useEffect(() => {
    // Pause background polling while editing a draft or when modals are active
    if (editingDraftId || connectOpen || filterOpen || bulkPublishOpen) {
      setPollingInterval(0);
      return;
    }

    const hasProcessing = data?.items?.some(p => p.publishStatus === 'processing');
    const hasPendingScrape = data?.items?.some(p => p.scrapePending);
    const hasMissingImage = data?.items?.some(p => p.isValidAmazon && !p.image);
    const hasPendingStock = data?.items?.some(p => p.isValidAmazon && p.stockQuantity == null);
    
    if ((hasPendingScrape || hasMissingImage || hasPendingStock) && scrapePollCount < 35) {
      setPollingInterval(3000);
      setScrapePollCount(prev => prev + 1);
    } else if (hasProcessing) {
      setPollingInterval(10000);
    } else {
      setPollingInterval(30000);
    }
  }, [data, editingDraftId, connectOpen, filterOpen, bulkPublishOpen, scrapePollCount]);

  useEffect(() => {
    setScrapePollCount(0);
  }, [page, limit, debouncedSearch, activeFilters]);

  const { data: filtersMeta } = useGetFiltersMetaQuery();
  const { data: connectionData } = useGetConnectionQuery();
  // /spreadsheet/connected returns { connected_sheets: [...] } — the old code read
  // connectionData.spreadsheet_url / .spreadsheet_name, which never existed, so the
  // banner always fell back to a generic "Google Sheet" label.
  const connectedSheet = connectionData?.connected_sheets?.[0] || null;
  const [resyncStock] = useResyncStockMutation();
  const [resyncingStockAsin, setResyncingStockAsin] = useState(null);

  const handleResyncStock = async (p, e) => {
    if (e) e.stopPropagation();
    if (!p?.asin) {
      toast.error("No ASIN available for this product.");
      return;
    }
    setResyncingStockAsin(p.asin);
    try {
      const res = await resyncStock({ asin: p.asin, country: p.country || "NL" }).unwrap();
      if (res.success) {
        toast.success(res.message || "Stock resynced successfully!");
      }
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to resync stock.");
    } finally {
      setResyncingStockAsin(null);
    }
  };

  const [revalidateInventoryItems, { isLoading: isRevalidatingInventory }] = useRevalidateInventoryItemsMutation();
  const [revalidatingItemId, setRevalidatingItemId] = useState(null);

  const handleBulkRevalidate = async () => {
    if (!selectedProducts || selectedProducts.length === 0) return;
    const eans = selectedProducts.map(p => p.ean).filter(Boolean);
    const itemIds = selectedProducts.map(p => p.itemId || p.id).filter(id => id && !String(id).startsWith('item-'));
    const asins = selectedProducts.map(p => p.asin).filter(Boolean);

    try {
      const res = await revalidateInventoryItems({
        item_ids: itemIds.length > 0 ? itemIds : undefined,
        eans: eans.length > 0 ? eans : undefined,
        asins: asins.length > 0 ? asins : undefined
      }).unwrap();
      toast.success(res.message || `Quality re-validation started for ${selectedProducts.length} product(s)!`);
      setSelectedProducts([]);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to re-validate selected products.");
    }
  };

  const handleSingleRevalidate = async (e, p) => {
    e?.stopPropagation();
    const targetId = p.itemId || p.id;
    setRevalidatingItemId(targetId);
    try {
      const res = await revalidateInventoryItems({
        item_ids: targetId && !String(targetId).startsWith('item-') ? [targetId] : undefined,
        asins: p.asin ? [p.asin] : undefined,
        eans: p.ean ? [p.ean] : undefined
      }).unwrap();
      toast.success(res.message || "Quality re-validation started! If passed, item stays here; if failed, moves to Needs Review.");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to re-validate product.");
    } finally {
      setRevalidatingItemId(null);
    }
  };

  const applyFilters = () => {
    setActiveFilters(filters);
    setPage(1);
    setFilterOpen(false);
  };

  const products = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const loading = isLoading || (isFetching && !data);

  const [syncConnectedSheet, { isLoading: isSyncingSheet }] = useSyncConnectedSheetMutation();

  const handleResync = async () => {
    try {
      const res = await syncConnectedSheet().unwrap();
      if (res?.new_count > 0) {
        toast.success(res.message || `Spreadsheet synced! (${res.new_count} new product(s) added)`);
      } else {
        toast.success(res?.message || "Spreadsheet synced! No new products found.");
      }
    } catch (err) {
      toast.error(err?.data?.detail || "Error syncing spreadsheet.");
    }
  };

  const handleCopy = async (e, text) => {
    e.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {
      // navigator.clipboard is undefined on a non-HTTPS origin (e.g. reaching the
      // dashboard over a LAN IP), so fall back to a throwaway textarea.
      const ta = document.createElement("textarea");
      ta.value = String(text);
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        toast.error("Could not copy");
        return;
      } finally {
        document.body.removeChild(ta);
      }
    }
    toast.success(`Copied ${text}`);
  };

  const [generateDraft, { isLoading: isGenerating }] = useCreateDraftFromAmazonMutation();

  const handlePublishClick = async (e, p) => {
    e.stopPropagation();
    try {
      if (p.scrapePending || !p.title) {
        toast.error("Please wait until scraping is complete");
        return;
      }

      const payload = {
        asin: p.asin,
        country: p.country,
        title: p.spreadsheetTitle || p.title,
        ean: p.spreadsheetEan,
        estimated_price: p.price,
        status: "draft",
        photos: p.image ? [p.image] : []
      };

      const result = await generateDraft(payload).unwrap();
      if (result.success && result.data?.id) {
        setEditingDraftId(result.data.id);
      }
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to generate draft");
    }
  };

  const toggleSelection = (p) => {
    setSelectedProducts(prev => {
      if (prev.find(item => item.id === p.id)) {
        return prev.filter(item => item.id !== p.id);
      } else {
        return [...prev, p];
      }
    });
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      const selectable = products.filter(p => !p.scrapePending && p.title);
      setSelectedProducts(selectable);
    } else {
      setSelectedProducts([]);
    }
  };

  return (
    <div className="bg-gray-50/50 flex-grow min-h-screen pb-24 relative">
      <div className="bg-white rounded-lg p-4 card-shadow">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* Square spreadsheet-connection status. The dot is the whole status
                language: green = webhook active, grey = imported but not syncing,
                dashed tile = nothing connected. */}
            <Tooltip
              title={
                connectedSheet
                  ? `${connectedSheet.item_count} items imported · ${connectedSheet.is_syncing ? "auto-syncing" : "not syncing"}`
                  : "No spreadsheet connected"
              }
            >
              {connectedSheet ? (
                <a
                  href={connectedSheet.spreadsheet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative w-10 h-10 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 flex items-center justify-center text-gray-500 transition-colors shrink-0"
                >
                  <BsFileEarmarkSpreadsheet size={16} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                      connectedSheet.is_syncing ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                </a>
              ) : (
                <button
                  onClick={() => setConnectOpen(true)}
                  className="relative w-10 h-10 rounded border border-dashed border-gray-300 hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-colors shrink-0"
                >
                  <BsFileEarmarkSpreadsheet size={16} />
                </button>
              )}
            </Tooltip>

            <div className="leading-none">
              <h2 className="text-[22px] font-semibold text-gray-900 tracking-tight tabular-nums">
                {total.toLocaleString()}
                <span className="text-[13px] font-medium text-gray-400 ml-1.5">
                  Products
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-1">
                {connectedSheet
                  ? connectedSheet.is_syncing
                    ? "Spreadsheet connected & syncing"
                    : "Spreadsheet connected"
                  : "No spreadsheet connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<FiSearch className="text-gray-400 mr-1" />}
              placeholder="Search"
              className="h-9 w-full sm:w-56"
            />

            <button
              onClick={handleResync}
              disabled={isSyncingSheet}
              title="Sync from spreadsheet"
              className="w-9 h-9 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <LuRefreshCw size={16} className={isSyncingSheet ? "animate-spin" : ""} />
            </button>

            <Popover
              content={
                <div className="flex flex-col gap-2 p-2">
                  {Object.keys(columns)
                    .filter(col => !HIDDEN_COLUMN_TOGGLES.includes(col))
                    .map(col => (
                      <Checkbox
                        key={col}
                        checked={columns[col]}
                        onChange={e => setColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                      >
                        {col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Checkbox>
                    ))}
                </div>
              }
              trigger="click"
              open={viewOpen}
              onOpenChange={setViewOpen}
              placement="bottomRight"
            >
              <button
                title="View columns"
                className="w-9 h-9 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <FiEye size={16} />
              </button>
            </Popover>
            <button
              onClick={() => setFilterOpen(true)}
              title="Filter products"
              className={`w-9 h-9 rounded border flex items-center justify-center transition-colors ${Object.keys(activeFilters).length ? 'border-gray-900 text-gray-900 bg-gray-100' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <FiFilter size={16} />
            </button>

            <Select
              value={sortBy ? `${sortBy}-${sortOrder}` : "default"}
              onChange={(val) => {
                if (val === "default") {
                  setSortBy("");
                  setSortOrder("asc");
                } else {
                  const [by, order] = val.split("-");
                  setSortBy(by);
                  setSortOrder(order);
                }
                setPage(1);
              }}
              className="w-40 h-9 custom-select"
              options={[
                { value: 'default', label: 'Default order' },
                { value: 'creation-desc', label: 'Newest first' },
                { value: 'creation-asc', label: 'Oldest first' },
                { value: 'price-desc', label: 'Price: high first' },
                { value: 'price-asc', label: 'Price: low first' },
                { value: 'stock-desc', label: 'Stock: high first' },
                { value: 'stock-asc', label: 'Stock: low first' },
                { value: 'title-asc', label: 'Title: A–Z' },
                { value: 'title-desc', label: 'Title: Z–A' },
              ]}
            />

            <div className="flex bg-gray-100 rounded p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${view === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"
                  }`}
              >
                <BsGrid size={15} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"
                  }`}
              >
                <BsListUl size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips (if any filter is selected) */}
        {Object.keys(activeFilters).length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-2 text-sm font-medium border-b border-gray-100 flex-wrap">
            <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mr-1">Filters</span>
            {activeFilters.filter_brand && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-700 text-[11px] font-medium">
                Brand: {activeFilters.filter_brand}
                <button
                  onClick={() => {
                    const newF = { ...activeFilters };
                    delete newF.filter_brand;
                    setActiveFilters(newF);
                    setFilters(newF);
                    setPage(1);
                  }}
                  className="hover:text-red-500 font-bold ml-0.5"
                >
                  ✕
                </button>
              </span>
            )}
            {activeFilters.filter_category && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-700 text-[11px] font-medium">
                Category: {activeFilters.filter_category}
                <button
                  onClick={() => {
                    const newF = { ...activeFilters };
                    delete newF.filter_category;
                    setActiveFilters(newF);
                    setFilters(newF);
                    setPage(1);
                  }}
                  className="hover:text-red-500 font-bold ml-0.5"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setActiveFilters({});
                setFilters({});
                setPage(1);
              }}
              className="text-[11px] text-gray-500 hover:text-gray-900 font-medium ml-1"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Connect prompt — only when nothing is imported yet. The connected state now
            lives in the square status tile beside the product count. */}
        {total === 0 && (
          <button
            onClick={() => setConnectOpen(true)}
            className="w-full flex items-center justify-between rounded px-4 py-3 mb-4 text-left border border-dashed border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Connect Your Inventory
              </p>
              <p className="text-xs text-gray-500">
                Import products from a Google Spreadsheet link
              </p>
            </div>
            <span className="button-color text-[11px] px-3 py-1.5 rounded flex items-center gap-1.5 font-medium">
              <FiPlus size={14} /> Connect
            </span>
          </button>
        )}

        {/* States */}
        {loading ? (
          view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {Array.from({ length: limit > 20 ? 20 : limit }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <ListSkeleton rows={limit > 12 ? 12 : limit} />
          )
        ) : products.length === 0 ? (
          <div className="py-16">
            <Empty
              description={
                isError
                  ? "Couldn't reach the server. Is the backend running?"
                  : debouncedSearch || Object.keys(activeFilters).length > 0
                    ? `No products match your filters or search.`
                    : data?.has_any_items
                      ? "All your imported products are in the Needs Review queue."
                      : "No products yet. Connect your inventory to import."
              }
            />
          </div>
        ) : view === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className="cursor-pointer text-left bg-white rounded-md border border-gray-200 p-2.5 hover:border-gray-400 transition-colors flex flex-col group h-full"
              >
                <div className="bg-gray-50 rounded h-24 flex items-center justify-center mb-2 overflow-hidden relative w-full">
                  <div className="absolute top-1.5 left-1.5 z-20" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedProducts.some(item => item.id === p.id)}
                      onChange={() => toggleSelection(p)}
                      disabled={p.scrapePending || !p.title}
                      className="bg-white/90 rounded backdrop-blur-sm"
                    />
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end z-10">
                    {columns.status && p.status && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold backdrop-blur-md border ${p.status?.toLowerCase() === 'online' ? 'bg-white/90 text-gray-700 border-gray-200' : 'bg-white/90 text-gray-500 border-gray-200'}`}>
                        {p.status}
                      </span>
                    )}
                    {columns.stock && (
                      <button
                        type="button"
                        disabled={resyncingStockAsin === p.asin}
                        onClick={(e) => handleResyncStock(p, e)}
                        title="Click to resync live stock quantity from Amazon"
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold backdrop-blur-md border flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-75 ${getStockBadgeColor(p)}`}
                      >
                        <span>
                          {resyncingStockAsin === p.asin ? (
                            "Resyncing..."
                          ) : p.stockQuantity != null ? (
                            p.stockQuantity > 0 ? `${p.stockQuantity} in stock` : "Out of stock"
                          ) : p.bolStock != null ? (
                            `${p.bolStock} in stock`
                          ) : (
                            "Checking stock..."
                          )}
                        </span>
                        <LuRefreshCw
                          size={11}
                          className={`${resyncingStockAsin === p.asin ? "animate-spin" : "opacity-60"}`}
                        />
                      </button>
                    )}
                  </div>
                  {p.thumbnail ? (
                    <img
                      src={p.thumbnail}
                      alt={p.title}
                      width={160}
                      height={96}
                      loading="lazy"
                      decoding="async"
                      className="h-[86%] w-[86%] object-contain"
                    />
                  ) : p.scrapePending ? (
                    <span className="text-gray-400 text-xs font-medium animate-pulse">
                      Syncing…
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs font-medium">No image</span>
                  )}
                </div>

                <div className="flex flex-col flex-grow w-full">
                  {columns.title && (
                    <p className="text-[12px] font-medium text-gray-900 line-clamp-2 leading-snug mb-1 min-h-[2.2em]">
                      {p.title || p.spreadsheetTitle || p.asin || "Loading product..."}
                    </p>
                  )}
                  {columns.sheetTitle && p.spreadsheetTitle && (
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug mb-1" title={p.spreadsheetTitle}>
                      📝 {p.spreadsheetTitle}
                    </p>
                  )}
                  {columns.category && p.category && (
                    <div className="mb-1.5">
                      <span className="inline-flex px-1.5 py-0.5 border border-gray-200 text-gray-500 rounded text-[9px] font-medium truncate max-w-full">
                        {p.category}
                      </span>
                    </div>
                  )}
                  {columns.brand && p.product_brand && (
                    <div className="mb-1.5">
                      <span className="inline-flex px-1.5 py-0.5 border border-gray-200 text-gray-600 rounded text-[9px] font-semibold uppercase tracking-wide truncate max-w-full">
                        {p.product_brand}
                      </span>
                    </div>
                  )}
                  {p.scrapePending ? (
                    <p className="text-[10px] text-gray-400 mb-1.5 font-medium flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> Auto-loading details…
                    </p>
                  ) : (
                    <div className="flex items-center justify-between mb-1.5">
                      {columns.price && (
                        <p className="text-[15px] font-semibold text-gray-900 tabular-nums">
                          {p.price ? `€${p.price}` : "—"}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Tooltip title="Quality Re-validate (Bol Duplicate & Amazon Rating checks). If failed, moves to Needs Review.">
                          <button
                            type="button"
                            disabled={revalidatingItemId === (p.itemId || p.id)}
                            onClick={(e) => handleSingleRevalidate(e, p)}
                            className="p-1 rounded border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center disabled:opacity-50"
                          >
                            <LuShieldCheck size={13} className={revalidatingItemId === (p.itemId || p.id) ? "animate-spin" : ""} />
                          </button>
                        </Tooltip>
                        {columns.publishAction && (
                          p.publishStatus === 'published' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 cursor-default">
                                Published
                              </span>
                              <OfferActionMenu offer={{ offerId: p.bol_offer_id, onHoldByRetailer: p.bol_on_hold, stock: { amount: p.bol_stock } }} />
                            </div>
                          ) : p.publishStatus === 'failed' ? (
                            <Tooltip title={p.publishError || "Publishing to Bol.com failed. Click to re-try."}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected(p);
                                }}
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
                              >
                                Failed
                              </button>
                            </Tooltip>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (p.publishStatus === 'processing') {
                                  toast("This product is currently processing. Bol.com may take up to 15 minutes to display it.");
                                } else {
                                  setSelected(p); // Open details modal to start publish flow
                                }
                              }}
                              className={`text-[9px] font-semibold px-2 py-0.5 rounded border transition-colors ${p.publishStatus === 'processing'
                                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'border-gray-300 text-gray-800 hover:bg-gray-900 hover:text-white hover:border-gray-900'
                                }`}
                            >
                              {p.publishStatus === 'processing' ? 'Processing...' : 'Publish'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    {columns.ratings && (
                      <div className="flex items-center gap-1.5 text-[10px] mt-1">
                        <span className="flex items-center gap-1 text-gray-500 font-medium">
                          <FaStar size={10} className="mb-[1px]" />
                          {p.rating || "—"}
                        </span>
                        <span className="text-gray-400 font-medium">
                          {p.reviews} Reviews
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {(columns.asin || columns.ean || columns.sheetSource) && (
                  <div className="flex flex-wrap items-center gap-1 mt-auto pt-2 border-t border-gray-100 w-full">
                    {columns.asin && (
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, p.asin)}
                        title="Copy ASIN"
                        className="flex items-center gap-1 px-1 py-0.5 rounded group/copy border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <span className="text-[9px] font-semibold text-gray-400 tracking-wide">ASIN</span>
                        <span className="text-[10px] text-gray-700 font-mono truncate max-w-[75px]">{p.asin}</span>
                        <FiCopy size={10} className="text-gray-300 group-hover/copy:text-gray-900 transition-colors" />
                      </button>
                    )}
                    {columns.ean && p.ean && (
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, p.ean)}
                        title="Copy EAN"
                        className="flex items-center gap-1 px-1 py-0.5 rounded group/copy border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <span className="text-[9px] font-semibold text-gray-400 tracking-wide">EAN</span>
                        <span className="text-[10px] text-gray-700 font-mono truncate max-w-[85px]">{p.ean}</span>
                        <FiCopy size={10} className="text-gray-300 group-hover/copy:text-gray-900 transition-colors" />
                      </button>
                    )}
                    {columns.sheetSource && p.spreadsheetUrl && (
                      <a
                        href={`${p.spreadsheetUrl}${p.sheetId ? `&gid=${p.sheetId}` : ''}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-gray-900 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 text-[9px] whitespace-nowrap font-medium ml-auto"
                        onClick={e => e.stopPropagation()}
                      >
                        <FiLink size={10} />
                        {p.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/) ? `${p.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)[1].substring(0, 4)}..` : "Sheet"}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400">
                  <th className="py-2 px-2 w-8">
                    <Checkbox
                      checked={selectedProducts.length > 0 && selectedProducts.length === products.filter(p => !p.scrapePending && p.title).length}
                      indeterminate={selectedProducts.length > 0 && selectedProducts.length < products.filter(p => !p.scrapePending && p.title).length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(products.filter(p => !p.scrapePending && p.title));
                        } else {
                          setSelectedProducts([]);
                        }
                      }}
                    />
                  </th>
                  <th className="py-2 px-2 w-12" />
                  <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider">Product</th>
                  {columns.ean && <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider w-40">EAN</th>}
                  {columns.category && <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider w-32">Category</th>}
                  {columns.price && <th className="py-2 px-2 text-right text-[10px] font-semibold uppercase tracking-wider w-24">Price</th>}
                  {columns.stock && <th className="py-2 px-2 text-right text-[10px] font-semibold uppercase tracking-wider w-20">Stock</th>}
                  {columns.ratings && <th className="py-2 px-2 text-right text-[10px] font-semibold uppercase tracking-wider w-20">Rating</th>}
                  {columns.publishAction && <th className="py-2 px-2 text-right text-[10px] font-semibold uppercase tracking-wider w-40">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  // Respect the Title / Sheet Title toggles, but collapse them into one
                  // "Product" cell instead of spending two columns on near-identical text.
                  const displayName =
                    (columns.title ? p.title : null) ||
                    p.spreadsheetTitle ||
                    p.title ||
                    p.asin ||
                    "—";
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedProducts.some(item => item.id === p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(prev => [...prev, p]);
                            } else {
                              setSelectedProducts(prev => prev.filter(item => item.id !== p.id));
                            }
                          }}
                        />
                      </td>

                      <td className="py-2 px-2">
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt={displayName}
                            width={36}
                            height={36}
                            loading="lazy"
                            decoding="async"
                            className="w-9 h-9 object-contain rounded border border-gray-200 bg-white"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-[9px]">
                            —
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-2">
                        <p className="text-[12px] font-medium text-gray-900 line-clamp-1">
                          {displayName}
                        </p>
                        {/* Brand and ASIN ride under the name rather than taking columns
                            of their own — same information, far less horizontal space. */}
                        {(columns.brand || columns.asin) && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {columns.brand && p.product_brand && (
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[120px]">
                                {p.product_brand}
                              </span>
                            )}
                            {columns.asin && p.asin && (
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, p.asin)}
                                title="Copy ASIN"
                                className="group/copy inline-flex items-center gap-1 text-[10px] font-mono text-gray-400 hover:text-gray-900 transition-colors"
                              >
                                {p.asin}
                                <FiCopy size={9} className="text-gray-300 group-hover/copy:text-gray-900 transition-colors" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {columns.ean && (
                        <td className="py-2 px-2 text-gray-600">
                          {p.ean ? (
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, p.ean)}
                              title="Copy EAN"
                              className="group/copy inline-flex items-center gap-1.5 text-[11px] font-mono hover:text-gray-900 transition-colors"
                            >
                              {p.ean}
                              <FiCopy size={10} className="text-gray-300 group-hover/copy:text-gray-900 transition-colors" />
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )}

                      {columns.category && (
                        <td className="py-2 px-2">
                          {p.category ? (
                            <span className="inline-flex px-1.5 py-0.5 border border-gray-200 text-gray-600 rounded text-[10px] font-medium truncate max-w-full">
                              {p.category}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </td>
                      )}

                      {columns.price && (
                        <td className="py-2 px-2 text-right text-[12px] font-semibold text-gray-900 tabular-nums">
                          €{p.price?.toFixed(2) || "0.00"}
                        </td>
                      )}

                      {columns.stock && (
                        <td className="py-2 px-2 text-right">
                          {p.stockQuantity == null ? (
                            <span className="text-gray-300 text-[11px]">—</span>
                          ) : (
                            <span
                              className={`text-[11px] font-semibold tabular-nums ${
                                p.stockQuantity === 0
                                  ? "text-red-600"
                                  : p.stockQuantity <= 2
                                    ? "text-amber-700"
                                    : "text-gray-700"
                              }`}
                            >
                              {p.stockQuantity}
                            </span>
                          )}
                        </td>
                      )}

                      {columns.ratings && (
                        <td className="py-2 px-2 text-right text-[11px] text-gray-500 tabular-nums">
                          {p.rating || "—"}
                        </td>
                      )}

                      {columns.publishAction && (
                        <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip title="Quality Re-validate (EAN, Brand, Rating)">
                              <button
                                type="button"
                                disabled={revalidatingItemId === (p.itemId || p.id)}
                                onClick={(e) => handleSingleRevalidate(e, p)}
                                className="p-1 rounded border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center disabled:opacity-50"
                              >
                                <LuShieldCheck size={12} className={revalidatingItemId === (p.itemId || p.id) ? "animate-spin" : ""} />
                              </button>
                            </Tooltip>
                            {p.publishStatus === 'published' ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 cursor-default">
                                  Published
                                </span>
                                <OfferActionMenu offer={{ offerId: p.bol_offer_id, ean: p.ean, draftId: p.id, onHoldByRetailer: p.bol_on_hold, stock: { amount: p.bol_stock } }} />
                              </div>
                            ) : p.publishStatus === 'failed' ? (
                              <Tooltip title={p.publishError || "Publishing to Bol.com failed. Click to re-try."}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelected(p);
                                  }}
                                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  Failed
                                </button>
                              </Tooltip>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected(p);
                                }}
                                className="text-[9px] font-semibold px-2 py-0.5 rounded border border-gray-300 text-gray-800 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-colors"
                              >
                                Publish
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <Pagination
            current={page}
            total={totalPages}
            onChange={setPage}
            pageSize={limit}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            totalItems={total}
          />
        </div>
      </div>

      {/* Modals & Drawers */}
      <ProductDetailsModal
        open={!!selected}
        product={selected}
        onClose={() => setSelected(null)}
        onDraftCreated={(draftId) => setEditingDraftId(draftId)}
        onOpenDraftModal={(draftId) => setEditingDraftId(draftId)}
      />
      <DraftEditModal
        open={!!editingDraftId}
        draftId={editingDraftId}
        onClose={() => setEditingDraftId(null)}
      />
      <ConnectInventoryModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        selectedProducts={selectedProducts}
      />
      {bulkPublishOpen && (
        <BulkPublishModal
          products={selectedProducts}
          onClose={() => setBulkPublishOpen(false)}
          onClearSelection={() => setSelectedProducts([])}
        />
      )}

      {/* Sticky Bulk Action Bar */}
      {selectedProducts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-2xl shadow-xl border border-gray-200 flex items-center gap-6 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              {selectedProducts.length}
            </div>
            <span className="text-sm font-semibold text-gray-700">Products Selected</span>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setSelectedProducts([])} type="text" className="text-gray-500 hover:text-gray-800">
              Cancel
            </Button>
            <Button
              type="default"
              disabled={isRevalidatingInventory}
              className="border-gray-300 text-gray-700 hover:text-black font-semibold h-9 px-4 flex items-center gap-1.5"
              onClick={handleBulkRevalidate}
            >
              {isRevalidatingInventory ? (
                <LuRefreshCw className="animate-spin text-brand" size={14} />
              ) : (
                <LuShieldCheck className="text-blue-600" size={14} />
              )}
              Re-validate ({selectedProducts.length})
            </Button>
            <Button
              type="primary"
              className="bg-black hover:bg-gray-800 h-9 px-6 font-semibold"
              onClick={() => setBulkPublishOpen(true)}
            >
              Bulk Publish
            </Button>
          </div>
        </div>
      )}

      <Drawer
        title="Filter Products"
        placement="right"
        onClose={() => setFilterOpen(false)}
        open={filterOpen}
        extra={<Button type="primary" onClick={applyFilters}>Apply</Button>}
        width={320}
      >
        <div className="flex flex-col gap-6">
          {/* Moved out of the page header. Applies immediately rather than on "Apply",
              because it drives its own query param, not the `filters` object. */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Synced</label>
            <div className="grid grid-cols-2 gap-1.5">
              {DATE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setSyncDateRange((prev) => (prev === opt.key ? "" : opt.key));
                    setPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                    syncDateRange === opt.key
                      ? "bg-gray-900 text-white border-gray-900"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Status</label>
            <Select
              className="w-full"
              allowClear
              placeholder="e.g. Online"
              value={filters.filter_status}
              onChange={v => setFilters({ ...filters, filter_status: v })}
              options={(filtersMeta?.statuses || []).map(s => ({ label: s, value: s }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Publish Status</label>
            <Select
              className="w-full"
              allowClear
              placeholder="e.g. Online"
              value={filters.filter_status}
              onChange={v => setFilters({ ...filters, filter_status: v })}
              options={[
                { label: "Online (Published on Bol)", value: "Online" },
                { label: "Offline (Draft / Unpublished)", value: "Offline" },
              ]}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Stock</label>
            <Select
              className="w-full"
              allowClear
              placeholder="Select Stock Status"
              value={filters.filter_stock}
              onChange={v => setFilters({ ...filters, filter_stock: v })}
              options={["In Stock", "Low Stock (≤3)", "Out of Stock"].map(s => ({ label: s, value: s }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Brand</label>
            <Select
              className="w-full"
              allowClear
              showSearch
              placeholder="Search or select brand..."
              value={filters.filter_brand}
              onChange={v => setFilters({ ...filters, filter_brand: v })}
              options={(filtersMeta?.brands || []).map(b => ({ label: b, value: b }))}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Category</label>
            <Select
              className="w-full"
              allowClear
              showSearch
              placeholder="e.g. Electronics"
              value={filters.filter_category}
              onChange={v => setFilters({ ...filters, filter_category: v })}
              options={(filtersMeta?.categories || ["General", "Electronics", "Home & Kitchen", "Fashion", "Sports"]).map(s => ({ label: s, value: s }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Delivery Time</label>
            <Select
              className="w-full"
              allowClear
              placeholder="Select Delivery Timeframe"
              value={filters.filter_delivery}
              onChange={v => setFilters({ ...filters, filter_delivery: v })}
              options={[
                "1-2 days",
                "2-3 days",
                "3-5 days",
                "5-8 days",
                "8-14 days"
              ].map(s => ({ label: s, value: s }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Return Rate Threshold</label>
            <Select
              className="w-full"
              allowClear
              placeholder="Filter by Return Rate"
              value={filters.filter_return_rate}
              onChange={v => setFilters({ ...filters, filter_return_rate: v })}
              options={[
                { label: "All Return Rates", value: "All" },
                { label: "Low Return Rate (< 5%)", value: "< 5%" },
                { label: "Medium Return Rate (5 - 10%)", value: "5 - 10%" },
                { label: "High Return Rate (> 10%)", value: "> 10%" },
              ]}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-600">Price Multiplier (Central Setting)</label>
              <span className="text-[10px] text-blue-600 font-bold">.95 Rounding + €39.95 Floor</span>
            </div>
            <Select
              className="w-full"
              value={filters.multiplier || 2.5}
              onChange={v => setFilters({ ...filters, multiplier: v })}
              options={[
                { label: "x2.0 Multiplier", value: 2.0 },
                { label: "x2.5 Multiplier (Default)", value: 2.5 },
                { label: "x2.6 Multiplier", value: 2.6 },
                { label: "x3.0 Multiplier", value: 3.0 },
              ]}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-600">Price Range (€)</label>
              <span className="text-[10px] text-gray-400">
                {filters.filter_min_price ?? (filtersMeta?.price_range?.[0] || 0)} - {filters.filter_max_price ?? (filtersMeta?.price_range?.[1] || 1000)}
              </span>
            </div>
            <Slider
              range
              min={filtersMeta?.price_range?.[0] || 0}
              max={filtersMeta?.price_range?.[1] || 1000}
              value={[
                filters.filter_min_price ?? (filtersMeta?.price_range?.[0] || 0),
                filters.filter_max_price ?? (filtersMeta?.price_range?.[1] || 1000)
              ]}
              onChange={([min, max]) => setFilters({ ...filters, filter_min_price: min, filter_max_price: max })}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-600">Purchase Price Range (€)</label>
              <span className="text-[10px] text-gray-400">
                {filters.filter_min_purchase ?? (filtersMeta?.purchase_range?.[0] || 0)} - {filters.filter_max_purchase ?? (filtersMeta?.purchase_range?.[1] || 1000)}
              </span>
            </div>
            <Slider
              range
              min={filtersMeta?.purchase_range?.[0] || 0}
              max={filtersMeta?.purchase_range?.[1] || 1000}
              value={[
                filters.filter_min_purchase ?? (filtersMeta?.purchase_range?.[0] || 0),
                filters.filter_max_purchase ?? (filtersMeta?.purchase_range?.[1] || 1000)
              ]}
              onChange={([min, max]) => setFilters({ ...filters, filter_min_purchase: min, filter_max_purchase: max })}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-600">Minimum Rating</label>
              {filters.filter_min_rating && (
                <span className="text-[10px] text-brand">{filters.filter_min_rating}+ Stars</span>
              )}
            </div>
            <Rate
              allowHalf
              value={filters.filter_min_rating || 0}
              onChange={v => setFilters({ ...filters, filter_min_rating: v })}
              className="text-brand text-lg"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Valid Amazon Link?</label>
            <Select
              className="w-full"
              allowClear
              placeholder="Any"
              value={filters.filter_is_valid_amazon}
              onChange={v => setFilters({ ...filters, filter_is_valid_amazon: v })}
              options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
            />
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => {
              setFilters({});
              setActiveFilters({});
            }}>Clear All</Button>
            <Button type="primary" onClick={applyFilters} className="flex-1 bg-brand">Apply Filters</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

const ProductCardSkeleton = () => (
  <div className="rounded-xl border border-gray-100 p-3 animate-pulse">
    <div className="bg-gray-100 rounded-lg h-32 mb-3" />
    <div className="h-3 bg-gray-100 rounded w-5/6 mb-2" />
    <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
    <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
  </div>
);

const ListSkeleton = ({ rows = 12 }) => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 py-2">
        <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0" />
        <div className="h-3 bg-gray-100 rounded flex-1 max-w-[240px]" />
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="h-3 bg-gray-100 rounded w-12" />
        <div className="h-3 bg-gray-100 rounded w-10" />
        <div className="ml-auto h-6 w-14 bg-gray-100 rounded-full" />
      </div>
    ))}
  </div>
);

export default Products;
