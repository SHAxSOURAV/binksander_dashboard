import React, { useState, useEffect, useMemo } from "react";
import { 
  useGetBolOffersQuery, 
  useSyncBolOffersMutation,
  useGetBolProductImagesBatchQuery,
  useGetBolOfferInsightsBatchQuery,
  useBulkDeleteBolOffersMutation,
  useBulkUpdateBolOfferStockMutation,
  useBulkUpdateBolOfferStatusMutation,
  useRevalidateProductsContentMutation
} from "../../Redux/productApis";
import { Empty, Spin, Tag, Input, Drawer, Select, Button, Slider, Rate, Popover, Checkbox, Modal, InputNumber, Radio, Tooltip } from "antd";
import { LuRefreshCw, LuUnplug, LuBoxes, LuTrash2, LuCheck, LuPause, LuSparkles } from "react-icons/lu";
import { FiSearch, FiFilter, FiEye, FiLink, FiCopy, FiAlertCircle, FiX } from "react-icons/fi";
import { BsGrid, BsListUl } from "react-icons/bs";
import toast from "react-hot-toast";
import Pagination from "../../components/shared/Pagination";
import BolProductImage from "./BolProductImage";
import OfferInsights from "./components/OfferInsights";
import OfferDetailsModal from "./components/OfferDetailsModal";
import OfferActionMenu from "./components/OfferActionMenu";
import { useUI } from "../../Provider/ContextProvider";
import { useGetBolCredentialsQuery } from "../../Redux/connectionApis";

// Columns that exist in state but are never offered in the toggle: the row actions
// are always on, and For Sale / Not For Sale already shows as a badge on every card.
const HIDDEN_OFFER_COLUMNS = ["action", "status"];

const BolListing = () => {
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState(null);
  
  // Drawer filter states
  const [filters, setFilters] = useState({
    filter_status: undefined,
    filter_brand: undefined,
    filter_stock: undefined,
    filter_min_price: undefined,
    filter_max_price: undefined
  });
  const [activeFilters, setActiveFilters] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const { openSettings, activeBolAccountId } = useUI();

  // Multi-select state
  const [selectedOffers, setSelectedOffers] = useState([]);
  
  // Bulk action modals
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [bulkStockAmount, setBulkStockAmount] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [columns, setColumns] = useState({
    ean: true, title: true, condition: false, price: true, stock: true, status: false, action: true
  });

  const { data: bolCreds = [], isLoading: credsLoading } = useGetBolCredentialsQuery();
  const activeCred = bolCreds.find(c => c.account_id === activeBolAccountId);
  const isNotConnected = !credsLoading && (!activeCred || !activeCred.is_secret_set);

  // Bulk API Mutations
  const [bulkDeleteOffers, { isLoading: isBulkDeleting }] = useBulkDeleteBolOffersMutation();
  const [bulkUpdateStock, { isLoading: isBulkUpdatingStock }] = useBulkUpdateBolOfferStockMutation();
  const [bulkUpdateStatus, { isLoading: isBulkUpdatingStatus }] = useBulkUpdateBolOfferStatusMutation();
  const [revalidateContent, { isLoading: isRevalidatingContent }] = useRevalidateProductsContentMutation();

  // Debounce search and reset pagination & selection
  useEffect(() => {
    const t = setTimeout(() => {
      if (debouncedSearch !== search) {
        setDebouncedSearch(search);
        setPage(1);
        setSelectedOffers([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);
  
  const applyFilters = () => {
    setActiveFilters(filters);
    setPage(1);
    setSelectedOffers([]);
    setFilterOpen(false);
  };

  const clearAllFilters = () => {
    const empty = {
      filter_status: undefined,
      filter_brand: undefined,
      filter_stock: undefined,
      filter_min_price: undefined,
      filter_max_price: undefined
    };
    setFilters(empty);
    setActiveFilters(empty);
    setPage(1);
    setSelectedOffers([]);
  };

  const removeSingleFilter = (key) => {
    const updated = { ...activeFilters, [key]: undefined };
    setActiveFilters(updated);
    setFilters(prev => ({ ...prev, [key]: undefined }));
    setPage(1);
  };

  const activeFilterCount = Object.keys(activeFilters).filter(k => activeFilters[k] !== undefined && activeFilters[k] !== "").length;

  const { data, isLoading, isFetching, refetch, isError } = useGetBolOffersQuery({
    page: page,
    limit: limit,
    search: debouncedSearch,
    sort: sort,
    ...activeFilters
  });

  const [syncBolOffers, { isLoading: isSyncing }] = useSyncBolOffersMutation();

  const handleRefresh = async () => {
    try {
      await syncBolOffers().unwrap();
      setSelectedOffers([]);
      toast.success("Successfully synchronized with Bol.com");
    } catch (err) {
      toast.error("Failed to sync with Bol.com");
    }
  };

  // Memoised so the batch-request args below keep a stable identity between renders.
  const offers = useMemo(() => data?.data || [], [data]);
  const brands = data?.brands || [];
  const totalItems = data?.total_items || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  // Resolve every card's image and Bol metrics in two requests rather than two per
  // card. Args are memoised so RTK Query doesn't refetch on unrelated re-renders.
  const pageEans = useMemo(() => offers.map((o) => o.ean).filter(Boolean), [offers]);
  const pageInsightArgs = useMemo(
    () =>
      offers
        .filter((o) => o.offerId)
        .map((o) => ({
          offer_id: o.offerId,
          ean: o.ean,
          price: o.pricing?.bundlePrices?.[0]?.unitPrice,
        })),
    [offers],
  );

  const { data: imagesRes } = useGetBolProductImagesBatchQuery(pageEans, {
    skip: pageEans.length === 0,
  });
  const { data: insightsRes } = useGetBolOfferInsightsBatchQuery(pageInsightArgs, {
    skip: pageInsightArgs.length === 0,
  });

  const imageMap = imagesRes?.images || {};
  const insightMap = insightsRes?.insights || {};

  const handlePageSizeChange = (size) => {
    setLimit(size);
    setPage(1);
    setSelectedOffers([]);
  };

  const isOfferForSale = (offer) => {
    if (Array.isArray(offer?.countryAvailabilities) && offer.countryAvailabilities.length > 0) {
      return offer.countryAvailabilities.some(c => c.forSale === true);
    }
    if (offer?.store?.visible !== undefined) {
      return Boolean(offer.store.visible);
    }
    return !offer?.onHoldByRetailer;
  };

  const handleCopyEan = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {
      // navigator.clipboard is undefined on a non-HTTPS origin (e.g. a LAN IP).
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

  // Selection handlers
  const toggleSelectOffer = (offer) => {
    setSelectedOffers(prev => {
      const exists = prev.some(o => o.offerId === offer.offerId);
      if (exists) {
        return prev.filter(o => o.offerId !== offer.offerId);
      } else {
        return [...prev, offer];
      }
    });
  };

  const allSelected = offers.length > 0 && offers.every(o => selectedOffers.some(so => so.offerId === o.offerId));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedOffers([]);
    } else {
      setSelectedOffers([...offers]);
    }
  };

  // Bulk Action: Stock Update
  const handleBulkUpdateStock = async () => {
    if (selectedOffers.length === 0) return;
    try {
      const offer_ids = selectedOffers.map(o => o.offerId);
      const res = await bulkUpdateStock({ offer_ids, amount: Number(bulkStockAmount) }).unwrap();
      toast.success(`Updated stock to ${bulkStockAmount} for ${res.updated_count || selectedOffers.length} offers`);
      setStockModalOpen(false);
      setSelectedOffers([]);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update stock");
    }
  };

  // Bulk Action: Status Change (For Sale vs Not For Sale)
  const handleBulkStatusChange = async (onHold) => {
    if (selectedOffers.length === 0) return;
    try {
      const offer_ids = selectedOffers.map(o => o.offerId);
      const res = await bulkUpdateStatus({ offer_ids, onHoldByRetailer: onHold }).unwrap();
      toast.success(`Set ${res.updated_count || selectedOffers.length} offers to ${onHold ? 'Not For Sale (Paused)' : 'For Sale (Live)'}`);
      setSelectedOffers([]);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update offer status");
    }
  };

  // Bulk Action: Delete Offers
  const handleBulkDelete = async () => {
    if (selectedOffers.length === 0) return;
    try {
      const offer_ids = selectedOffers.map(o => o.offerId);
      const res = await bulkDeleteOffers({ offer_ids }).unwrap();
      toast.success(`Successfully deleted ${res.deleted_count || selectedOffers.length} offers from Bol.com`);
      setDeleteConfirmOpen(false);
      setSelectedOffers([]);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to delete offers");
    }
  };

  // Bulk Action: Re-enrich and Fix Content on Bol.com
  const handleBulkRevalidate = async () => {
    if (selectedOffers.length === 0) return;
    try {
      const eans = selectedOffers.map(o => o.ean).filter(Boolean);
      const res = await revalidateContent({ eans, accountId: activeBolAccountId }).unwrap();
      toast.success(`Content enriched & submitted to Bol.com for ${res.results?.length || selectedOffers.length} products`);
      setSelectedOffers([]);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to re-enrich content");
    }
  };

  return (
    <div className="bg-gray-50/50 flex-grow min-h-screen pb-28 relative">
      <div className="bg-white rounded-lg p-4 card-shadow">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Square Bol-connection status, same language as the spreadsheet tile on
                Inventory Catalog. Replaces the old "Connected Retailer Account" strip. */}
            <Tooltip
              title={
                isNotConnected
                  ? "No Bol account connected"
                  : `${activeCred?.account_name || "Bol account"} · Retailer API v11`
              }
            >
              <div
                className={`relative w-10 h-10 rounded border flex items-center justify-center shrink-0 ${
                  isNotConnected
                    ? "border-dashed border-gray-300 text-gray-400"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              >
                <FiLink size={15} />
                {!isNotConnected && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-green-500" />
                )}
              </div>
            </Tooltip>

            <div className="leading-none">
              <h2 className="text-[22px] font-semibold text-gray-900 tracking-tight tabular-nums">
                {totalItems.toLocaleString()}
                <span className="text-[13px] font-medium text-gray-400 ml-1.5">Offers</span>
              </h2>
              <div className="flex items-center gap-2.5 mt-1">
                <p className="text-[11px] text-gray-400">
                  {isNotConnected
                    ? "No Bol account connected"
                    : `Live from ${activeCred?.account_name || "Bol.com"}`}
                </p>
                {/* Only meaningful once a selection exists — until then it is noise
                    competing with the offer count. */}
                {selectedOffers.length > 0 && !allSelected && (
                  <button
                    onClick={toggleSelectAll}
                    className="text-[11px] font-medium text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
                  >
                    Select all {offers.length}
                  </button>
                )}
              </div>
            </div>

          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<FiSearch className="text-gray-400 mr-1" />}
              placeholder="Search by Title or EAN..."
              className="h-10 rounded-lg w-full sm:w-64"
            />
            <button
              onClick={handleRefresh}
              disabled={isSyncing || isFetching}
              title="Refresh from Bol.com"
              className="w-9 h-9 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <LuRefreshCw size={16} className={isSyncing || isFetching ? "animate-spin" : ""} />
            </button>

            <Popover
              content={
                <div className="flex flex-col gap-2 p-2">
                  {Object.keys(columns)
                    .filter(col => !HIDDEN_OFFER_COLUMNS.includes(col))
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
              title="Filter offers"
              className={`h-10 px-3 rounded-lg border flex items-center gap-2 transition-colors ${
                activeFilterCount > 0
                  ? 'border-gray-900 text-gray-900 bg-gray-100 font-medium' 
                  : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <FiFilter size={16} />
              <span className="text-xs font-medium">Filter</span>
              {activeFilterCount > 0 && (
                <span className="bg-gray-900 text-white text-[10px] w-4 h-4 rounded flex items-center justify-center font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <Select
              placeholder="Sort by..."
              value={sort}
              onChange={(val) => { setSort(val); setPage(1); }}
              allowClear
              className="w-44 h-10 custom-select"
              options={[
                { value: "price_asc", label: "Price: Low to High" },
                { value: "price_desc", label: "Price: High to Low" },
                { value: "stock_desc", label: "Stock: High to Low" },
                { value: "stock_asc", label: "Stock: Low to High" },
                { value: "title_asc", label: "Title: A to Z" },
                { value: "title_desc", label: "Title: Z to A" },
              ]}
            />

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView("grid")}
                className={`w-8 h-8 rounded-md flex items-center justify-center ${
                  view === "grid" ? "bg-brand text-white" : "text-gray-400"
                }`}
              >
                <BsGrid size={15} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`w-8 h-8 rounded-md flex items-center justify-center ${
                  view === "list" ? "bg-brand text-white" : "text-gray-400"
                }`}
              >
                <BsListUl size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 flex-wrap">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mr-1">Active Filters:</span>
            {activeFilters.filter_status && (
              <span className="inline-flex items-center gap-1.5 text-gray-700 text-[11px] px-2 py-0.5 rounded border border-gray-200 font-medium">
                Status: {activeFilters.filter_status === "for_sale" ? "For Sale (Live)" : "Not For Sale (Paused)"}
                <button onClick={() => removeSingleFilter("filter_status")} className="hover:text-blue-900"><FiX size={12} /></button>
              </span>
            )}
            {activeFilters.filter_brand && (
              <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs px-2.5 py-1 rounded-lg border border-purple-200/60 font-medium">
                Brand: {activeFilters.filter_brand}
                <button onClick={() => removeSingleFilter("filter_brand")} className="hover:text-purple-900"><FiX size={12} /></button>
              </span>
            )}
            {activeFilters.filter_stock && (
              <span className="inline-flex items-center gap-1.5 text-gray-700 text-[11px] px-2 py-0.5 rounded border border-gray-200 font-medium">
                Stock: {activeFilters.filter_stock === "Yes" ? "In Stock" : "Out of Stock"}
                <button onClick={() => removeSingleFilter("filter_stock")} className="hover:text-emerald-900"><FiX size={12} /></button>
              </span>
            )}
            {(activeFilters.filter_min_price !== undefined || activeFilters.filter_max_price !== undefined) && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs px-2.5 py-1 rounded-lg border border-amber-200/60 font-medium">
                Price: €{activeFilters.filter_min_price ?? 0} - €{activeFilters.filter_max_price ?? 1000}
                <button onClick={() => { removeSingleFilter("filter_min_price"); removeSingleFilter("filter_max_price"); }} className="hover:text-amber-950"><FiX size={12} /></button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline ml-1 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

      {/* Main Content Area */}
      <div>

        {/* List / Grid View */}
        <div className="overflow-x-auto thin-scrollbar">
          {isLoading || (isFetching && !data) || credsLoading ? (
            view === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white rounded-md border border-gray-200 p-2.5 h-[240px] flex flex-col">
                    <div className="bg-gray-100 rounded h-24 w-full mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2 mb-4 animate-pulse"></div>
                    <div className="h-5 bg-gray-100 rounded w-1/3 mt-auto animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded p-2 animate-pulse">
                    <div className="w-10 h-10 bg-gray-100 rounded"></div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                    </div>
                    <div className="w-16 h-5 bg-gray-100 rounded"></div>
                    <div className="w-20 h-6 bg-gray-100 rounded-full"></div>
                  </div>
                ))}
              </div>
            )
          ) : isError || isNotConnected ? (
            <div className="flex flex-col justify-center items-center py-16 rounded border border-dashed border-gray-200 my-4">
              <div className="w-12 h-12 border border-red-200 text-red-500 rounded flex items-center justify-center mb-4">
                <LuUnplug size={32} />
              </div>
              <h3 className="text-gray-800 text-lg font-semibold mb-2">Bol.com Not Connected</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-md text-center">
                Please connect your Bol.com Retailer API credentials to view, manage, and sync your live offers.
              </p>
              <Button type="primary" onClick={() => openSettings("connection")} className="bg-gray-900">
                Connect Bol.com
              </Button>
            </div>
          ) : offers.length === 0 ? (
            <div className="py-16 text-center">
              <Empty
                description={
                  debouncedSearch || Object.keys(activeFilters).length > 0
                    ? "No offers match your search or filters."
                    : "No offers found in your Bol.com account."
                }
              />
            </div>
          ) : view === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {offers.map((offer) => {
                const isSelected = selectedOffers.some(o => o.offerId === offer.offerId);
                const forSale = isOfferForSale(offer);
                const title =
                  offer.store?.productTitle || offer.unknownProductTitle || "Unknown product";
                const unitPrice = offer.pricing?.bundlePrices?.[0]?.unitPrice;
                const stockAmount = offer.stock?.amount ?? 0;
                return (
                  <div
                    key={offer.offerId}
                    onClick={() => setSelectedOffer(offer)}
                    className={`cursor-pointer text-left bg-white rounded-md border p-2.5 transition-colors flex flex-col group h-full ${
                      isSelected ? "border-gray-900" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {/* Image well — checkbox top-left, stock top-right, exactly as the
                        Inventory Catalog card. */}
                    <div className="bg-gray-50 rounded h-24 flex items-center justify-center mb-2 overflow-hidden relative w-full">
                      <div className="absolute top-1.5 left-1.5 z-20" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelectOffer(offer)}
                          className="bg-white/90 rounded backdrop-blur-sm"
                        />
                      </div>

                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                        {columns.stock && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold backdrop-blur-md border ${
                              stockAmount === 0
                                ? "border-red-200 bg-red-50/90 text-red-600"
                                : stockAmount <= 2
                                  ? "border-amber-200 bg-amber-50/90 text-amber-700"
                                  : "border-gray-200 bg-white/90 text-gray-600"
                            }`}
                          >
                            {stockAmount} in stock
                          </span>
                        )}
                        {columns.action && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <OfferActionMenu offer={offer} />
                          </div>
                        )}
                      </div>

                      <BolProductImage
                        ean={offer.ean}
                        src={imageMap[offer.ean]}
                        className="h-[86%] w-[86%] object-contain bg-transparent"
                      />
                    </div>

                    <div className="flex flex-col flex-grow w-full">
                      {columns.title && (
                        <p
                          className="text-[12px] font-medium text-gray-900 line-clamp-2 leading-snug mb-1 min-h-[2.2em]"
                          title={title}
                        >
                          {title}
                        </p>
                      )}

                      {/* Chip row — the catalog's category/brand slot. For-sale state
                          reads as an outline chip with a dot rather than a filled pill. */}
                      <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-gray-200 text-gray-600 rounded text-[9px] font-semibold uppercase tracking-wide">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              forSale ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                          {forSale ? "For sale" : "Paused"}
                        </span>
                        {columns.condition && (
                          <span className="inline-flex px-1.5 py-0.5 border border-gray-200 text-gray-600 rounded text-[9px] font-semibold uppercase tracking-wide truncate max-w-full">
                            {offer.condition?.category || "NEW"}
                          </span>
                        )}
                      </div>

                      {columns.price && (
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <p className="text-[15px] font-semibold text-gray-900 tabular-nums">
                            {unitPrice != null ? `€${unitPrice.toFixed(2)}` : "—"}
                          </p>
                        </div>
                      )}

                      <OfferInsights insights={insightMap[offer.offerId]} />
                    </div>

                    {/* Footer mirrors the catalog's copyable identifier chips. */}
                    {columns.ean && offer.ean && (
                      <div className="flex flex-wrap items-center gap-1 mt-auto pt-2 border-t border-gray-100 w-full">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyEan(offer.ean);
                          }}
                          title="Copy EAN"
                          className="flex items-center gap-1 px-1 py-0.5 rounded group/copy border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-[9px] font-semibold text-gray-400 tracking-wide">EAN</span>
                          <span className="text-[10px] text-gray-700 font-mono truncate max-w-[85px]">
                            {offer.ean}
                          </span>
                          <FiCopy size={9} className="text-gray-300 group-hover/copy:text-gray-900 transition-colors" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* List / Table View */
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 bg-[#f9fafc] [&>th]:font-medium">
                  <th className="py-2 px-2 w-10">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={selectedOffers.length > 0 && !allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-2 px-2 w-10">#</th>
                  {columns.title && <th className="py-2 px-2">Product</th>}
                  {columns.ean && <th className="py-2 px-2">EAN</th>}
                  {columns.price && <th className="py-2 px-2">Price</th>}
                  {columns.stock && <th className="py-2 px-2">Stock</th>}
                  {columns.condition && <th className="py-2 px-2">Condition</th>}
                  <th className="py-2 px-2 text-left">Bol metrics</th>
                  {columns.status && <th className="py-2 px-2">Live Status</th>}
                  {columns.action && <th className="py-2 px-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {offers.map((offer, index) => {
                  const isSelected = selectedOffers.some(o => o.offerId === offer.offerId);
                  return (
                    <tr 
                      key={offer.offerId} 
                      onClick={() => setSelectedOffer(offer)}
                      className={`border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer ${
                        isSelected ? "bg-gray-50" : ""
                      }`}
                    >
                      <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelectOffer(offer)}
                        />
                      </td>
                      <td className="py-2 px-2 text-gray-500 text-xs">
                        {(page - 1) * limit + index + 1}
                      </td>
                      {columns.title && (
                        <td className="py-2 px-2 text-gray-700">
                          <div className="flex items-center gap-2">
                            <BolProductImage ean={offer.ean} src={imageMap[offer.ean]} className="w-8 h-8 rounded object-cover" />
                            <span className="text-gray-700 font-semibold line-clamp-1 max-w-[200px]" title={offer.store?.productTitle || offer.unknownProductTitle}>
                              {offer.store?.productTitle || offer.unknownProductTitle || "Unknown Product"}
                            </span>
                          </div>
                        </td>
                      )}
                      {columns.ean && (
                        <td className="py-2 px-2 text-gray-500 font-mono text-xs">
                          {offer.ean}
                        </td>
                      )}
                      {columns.price && (
                        <td className="py-2 px-2 text-[12px] font-semibold text-gray-900 tabular-nums">
                          €{offer.pricing?.bundlePrices?.[0]?.unitPrice?.toFixed(2) || "—"}
                        </td>
                      )}
                      {columns.stock && (
                        <td className="py-2 px-2 text-gray-700 font-medium">
                          {offer.stock?.amount || 0} in stock
                        </td>
                      )}
                      {columns.condition && (
                        <td className="py-2 px-2">
                          <span className="px-1.5 py-0.5 border border-gray-200 text-gray-600 text-[10px] rounded font-medium">
                            {offer.condition?.category || "NEW"}
                          </span>
                        </td>
                      )}
                      <td className="py-2 px-2">
                        <OfferInsights insights={insightMap[offer.offerId]} />
                      </td>
                      {columns.status && (
                        <td className="py-2 px-2">
                          {isOfferForSale(offer) ? (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-gray-600 border border-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              For Sale (Live)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-gray-500 border border-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                              Not For Sale
                            </span>
                          )}
                        </td>
                      )}
                      {columns.action && (
                        <td className="py-2 px-2 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end pr-2">
                            <OfferActionMenu offer={offer} />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && !isError && offers.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Pagination 
              current={page} 
              total={totalPages} 
              onChange={setPage} 
              pageSize={limit}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50, 100]}
              totalItems={totalItems}
            />
          </div>
        )}
      </div>

      {/* Sticky Bulk Action Bar */}
      {selectedOffers.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-2.5 rounded-md shadow-lg border border-gray-200 flex items-center gap-3 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gray-900 text-white flex items-center justify-center font-semibold text-[11px] tabular-nums">
              {selectedOffers.length}
            </div>
            <span className="text-[12px] font-medium text-gray-600">selected</span>
          </div>
          <div className="h-5 w-px bg-gray-200"></div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="small"
              onClick={handleBulkRevalidate}
              loading={isRevalidatingContent}
              className="h-8 px-3 text-xs font-medium text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <LuSparkles size={13} />
              Re-enrich
            </Button>
            <Button
              size="small"
              onClick={() => setStockModalOpen(true)}
              className="h-8 px-3 text-xs font-medium text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <LuBoxes size={13} />
              Stock
            </Button>
            <Button
              size="small"
              loading={isBulkUpdatingStatus}
              onClick={() => handleBulkStatusChange(false)}
              className="h-8 px-3 text-xs font-medium text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <LuCheck size={13} />
              For sale
            </Button>
            <Button
              size="small"
              loading={isBulkUpdatingStatus}
              onClick={() => handleBulkStatusChange(true)}
              className="h-8 px-3 text-xs font-medium text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <LuPause size={13} />
              Pause
            </Button>
            <Button
              size="small"
              danger
              onClick={() => setDeleteConfirmOpen(true)}
              className="h-8 px-3 text-xs font-medium flex items-center gap-1.5"
            >
              <LuTrash2 size={13} />
              Delete ({selectedOffers.length})
            </Button>
            <button
              onClick={() => setSelectedOffers([])}
              className="text-[11px] text-gray-400 hover:text-gray-900 font-medium ml-1 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Bulk Stock Update Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base font-bold text-gray-800">
            <LuBoxes className="text-blue-600" size={20} />
            Update Stock for {selectedOffers.length} Offers
          </div>
        }
        open={stockModalOpen}
        onCancel={() => setStockModalOpen(false)}
        onOk={handleBulkUpdateStock}
        confirmLoading={isBulkUpdatingStock}
        okText="Update Stock"
        okButtonProps={{ className: "bg-brand hover:bg-brand-dark" }}
      >
        <div className="py-4">
          <p className="text-xs text-gray-500 mb-3">
            Enter the new available stock quantity to apply to all <strong>{selectedOffers.length}</strong> selected Bol.com offers.
          </p>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">New Stock Amount</label>
          <InputNumber
            min={0}
            max={9999}
            value={bulkStockAmount}
            onChange={setBulkStockAmount}
            className="w-full h-10 text-base"
            placeholder="e.g. 10"
          />
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base font-bold text-rose-600">
            <FiAlertCircle size={20} />
            Delete {selectedOffers.length} Offers from Bol.com?
          </div>
        }
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        onOk={handleBulkDelete}
        confirmLoading={isBulkDeleting}
        okText="Yes, Delete Offers"
        okButtonProps={{ danger: true, className: "bg-rose-600 hover:bg-rose-700" }}
      >
        <div className="py-4 text-xs text-gray-600 leading-relaxed">
          Are you sure you want to permanently delete <strong>{selectedOffers.length}</strong> selected offers from your Bol.com account? 
          <p className="mt-2 text-rose-600 font-medium">
            This action will call Bol.com Retailer API to remove these offers. This cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Filter Drawer */}
      <Drawer
        title="Filter Bol.com Offers"
        placement="right"
        onClose={() => setFilterOpen(false)}
        open={filterOpen}
        extra={
          <div className="flex items-center gap-2">
            <Button onClick={clearAllFilters} size="small">Reset</Button>
            <Button type="primary" size="small" onClick={applyFilters} className="bg-gray-900">Apply</Button>
          </div>
        }
        width={340}
      >
        <div className="flex flex-col gap-6">
          {/* Status Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Offer Status</label>
            <Select 
              className="w-full"
              allowClear
              placeholder="All Statuses"
              value={filters.filter_status}
              onChange={v => setFilters({...filters, filter_status: v})}
              options={[
                { label: '🟢 For Sale (Live)', value: 'for_sale' },
                { label: '🔴 Not For Sale (Paused)', value: 'not_for_sale' }
              ]}
            />
          </div>

          {/* Brand Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Brand</label>
            <Select 
              className="w-full"
              allowClear
              placeholder="All Brands"
              value={filters.filter_brand}
              onChange={v => setFilters({...filters, filter_brand: v})}
              options={[
                { label: 'All Brands', value: '' },
                ...brands.map(b => ({ label: b, value: b }))
              ]}
            />
          </div>

          {/* Stock Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Stock Availability</label>
            <Select 
              className="w-full"
              allowClear
              placeholder="All Stock Levels"
              value={filters.filter_stock}
              onChange={v => setFilters({...filters, filter_stock: v})}
              options={[
                { label: 'In Stock (> 0)', value: 'Yes' },
                { label: 'Out of Stock (0)', value: 'No' }
              ]}
            />
          </div>

          {/* Price Range */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-700">Price Range (€)</label>
              <span className="text-[11px] text-gray-500 font-mono">
                €{filters.filter_min_price ?? 0} - €{filters.filter_max_price ?? 1000}
              </span>
            </div>
            <Slider 
              range 
              min={0} 
              max={1000}
              value={[
                filters.filter_min_price ?? 0, 
                filters.filter_max_price ?? 1000
              ]}
              onChange={([min, max]) => setFilters({...filters, filter_min_price: min, filter_max_price: max})} 
            />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
            <Button onClick={clearAllFilters} className="w-1/2">Clear All</Button>
            <Button type="primary" onClick={applyFilters} className="w-1/2 bg-brand">Apply Filters</Button>
          </div>
        </div>
      </Drawer>

      <OfferDetailsModal 
        offer={selectedOffer} 
        onClose={() => setSelectedOffer(null)} 
      />
    </div>
    </div>
  );
};

export default BolListing;
