import React, { useState, useEffect } from "react";
import { 
  useGetBolOffersQuery, 
  useSyncBolOffersMutation,
  useBulkDeleteBolOffersMutation,
  useBulkUpdateBolOfferStockMutation,
  useBulkUpdateBolOfferStatusMutation
} from "../../Redux/productApis";
import { Empty, Spin, Tag, Input, Drawer, Select, Button, Slider, Rate, Popover, Checkbox, Modal, InputNumber, Radio } from "antd";
import { LuRefreshCw, LuUnplug, LuBoxes, LuTrash2, LuCheck, LuPause } from "react-icons/lu";
import { FiSearch, FiFilter, FiEye, FiLink, FiCopy, FiAlertCircle, FiX } from "react-icons/fi";
import { BsGrid, BsListUl } from "react-icons/bs";
import toast from "react-hot-toast";
import Pagination from "../../components/shared/Pagination";
import BolProductImage from "./BolProductImage";
import OfferDetailsModal from "./components/OfferDetailsModal";
import OfferActionMenu from "./components/OfferActionMenu";
import { useUI } from "../../Provider/ContextProvider";
import { useGetBolCredentialsQuery } from "../../Redux/connectionApis";

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
    ean: true, title: true, condition: true, price: true, stock: true, status: false, action: true
  });

  const { data: bolCreds = [], isLoading: credsLoading } = useGetBolCredentialsQuery();
  const activeCred = bolCreds.find(c => c.account_id === activeBolAccountId);
  const isNotConnected = !credsLoading && (!activeCred || !activeCred.is_secret_set);

  // Bulk API Mutations
  const [bulkDeleteOffers, { isLoading: isBulkDeleting }] = useBulkDeleteBolOffersMutation();
  const [bulkUpdateStock, { isLoading: isBulkUpdatingStock }] = useBulkUpdateBolOfferStockMutation();
  const [bulkUpdateStatus, { isLoading: isBulkUpdatingStatus }] = useBulkUpdateBolOfferStatusMutation();

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

  const offers = data?.data || [];
  const brands = data?.brands || [];
  const totalItems = data?.total_items || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

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

  return (
    <div className="bg-gray-50/50 flex-grow min-h-screen pb-28 relative">
      <div className="bg-white rounded-2xl p-5 card-shadow">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-700">
              {totalItems} Offers
            </h2>
            {offers.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 font-medium cursor-pointer ml-1 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 transition-colors">
                <Checkbox
                  checked={allSelected}
                  indeterminate={selectedOffers.length > 0 && !allSelected}
                  onChange={toggleSelectAll}
                />
                <span>Select All ({offers.length})</span>
              </label>
            )}

            {/* Inline Quick Action Buttons when items are selected */}
            {selectedOffers.length > 0 && (
              <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-200 flex-wrap">
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                  {selectedOffers.length} selected
                </span>
                <Button
                  size="small"
                  onClick={() => setStockModalOpen(true)}
                  className="text-xs h-7 flex items-center gap-1 font-medium border-gray-300 text-gray-700 hover:text-black"
                >
                  <LuBoxes size={13} className="text-blue-600" />
                  Stock
                </Button>
                <Button
                  size="small"
                  onClick={() => handleBulkStatusChange(false)}
                  loading={isBulkUpdatingStatus}
                  className="text-xs h-7 flex items-center gap-1 font-medium bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                >
                  <LuCheck size={13} />
                  For Sale
                </Button>
                <Button
                  size="small"
                  onClick={() => handleBulkStatusChange(true)}
                  loading={isBulkUpdatingStatus}
                  className="text-xs h-7 flex items-center gap-1 font-medium bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                >
                  <LuPause size={13} />
                  Pause
                </Button>
                <Button
                  size="small"
                  danger
                  type="primary"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="text-xs h-7 flex items-center gap-1 font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                >
                  <LuTrash2 size={13} />
                  Delete Selected ({selectedOffers.length})
                </Button>
                <button
                  onClick={() => setSelectedOffers([])}
                  className="text-xs text-gray-400 hover:text-gray-700 ml-1 font-medium"
                >
                  Clear
                </button>
              </div>
            )}
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
              className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand disabled:opacity-50 transition-colors"
            >
              <LuRefreshCw size={16} className={isSyncing || isFetching ? "animate-spin text-brand" : ""} />
            </button>

            <Popover
              content={
                <div className="flex flex-col gap-2 p-2">
                  {Object.keys(columns)
                    .filter(col => col !== 'action')
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
                className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand"
              >
                <FiEye size={16} />
              </button>
            </Popover>

            <button
              onClick={() => setFilterOpen(true)}
              title="Filter offers"
              className={`h-10 px-3 rounded-lg border flex items-center gap-2 transition-colors ${
                activeFilterCount > 0
                  ? 'border-brand text-brand bg-brand/5 font-semibold' 
                  : 'border-gray-200 text-gray-600 hover:text-brand hover:border-gray-300'
              }`}
            >
              <FiFilter size={16} />
              <span className="text-xs font-medium">Filter</span>
              {activeFilterCount > 0 && (
                <span className="bg-brand text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
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
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg border border-blue-200/60 font-medium">
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
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-lg border border-emerald-200/60 font-medium">
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

        {/* Connected Integration Card Banner */}
        <div className="flex items-center gap-3 p-3 bg-[#f8f9fc] rounded-xl border border-gray-100 mb-5 text-sm">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <FiLink size={15} />
          </div>
          <div>
            <div className="font-semibold text-xs text-gray-800">Connected Retailer Account</div>
            <div className="text-[11px] text-blue-600 font-medium">Bol.com Retailer API v11</div>
          </div>
        </div>

      {/* Main Content Area */}
      <div>

        {/* List / Grid View */}
        <div className="overflow-x-auto thin-scrollbar">
          {isLoading || (isFetching && !data) || credsLoading ? (
            view === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3.5 h-[280px] flex flex-col">
                    <div className="bg-gray-100 rounded-xl h-40 w-full mb-4 animate-pulse"></div>
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2 mb-4 animate-pulse"></div>
                    <div className="h-5 bg-gray-100 rounded w-1/3 mt-auto animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white border border-gray-50 rounded-xl p-3 animate-pulse">
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
            <div className="flex flex-col justify-center items-center py-20 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 my-4 mx-2">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <LuUnplug size={32} />
              </div>
              <h3 className="text-gray-800 text-lg font-semibold mb-2">Bol.com Not Connected</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-md text-center">
                Please connect your Bol.com Retailer API credentials to view, manage, and sync your live offers.
              </p>
              <Button type="primary" onClick={() => openSettings("connection")} className="bg-brand">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {offers.map((offer) => {
                const isSelected = selectedOffers.some(o => o.offerId === offer.offerId);
                return (
                  <div
                    key={offer.offerId}
                    onClick={() => setSelectedOffer(offer)}
                    className={`cursor-pointer text-left bg-white rounded-2xl border p-3.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 flex flex-col group h-full relative ${
                      isSelected ? "border-brand ring-2 ring-brand/20 bg-brand/[0.02]" : "border-gray-100/80 hover:border-brand/20"
                    }`}
                  >
                    <div className="bg-[#f8f9fc] rounded-xl h-40 flex items-center justify-center mb-4 overflow-hidden relative group-hover:bg-[#f0f2f8] transition-colors w-full">
                      {/* Checkbox and Status Badge on Top-Left */}
                      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelectOffer(offer)}
                          className="scale-125 bg-white/90 rounded-md backdrop-blur-sm shadow-sm"
                        />
                        {isOfferForSale(offer) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md bg-emerald-500 text-white flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            For Sale
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md bg-rose-500 text-white flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-200"></span>
                            Not For Sale
                          </span>
                        )}
                      </div>

                      {/* Stock and Action Menu on Top-Right */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end z-10">
                        {columns.stock && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-200/60 backdrop-blur-md">
                            {offer.stock?.amount || 0} in stock
                          </span>
                        )}
                        {columns.action && (
                          <div className="mt-1" onClick={e => e.stopPropagation()}>
                            <OfferActionMenu offer={offer} />
                          </div>
                        )}
                      </div>

                      <BolProductImage 
                        ean={offer.ean} 
                        className="h-[85%] w-[85%] object-contain rounded-lg group-hover:scale-105 transition-transform duration-500 bg-transparent" 
                      />
                    </div>
                    
                    <div className="flex flex-col flex-grow w-full">
                      {columns.title && (
                        <p className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-snug mb-1.5" title={offer.store?.productTitle || offer.unknownProductTitle}>
                          {offer.store?.productTitle || offer.unknownProductTitle || "Unknown Product"}
                        </p>
                      )}
                      {columns.condition && (
                        <div className="mb-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium truncate max-w-full">
                            {offer.condition?.category || "NEW"}
                          </span>
                        </div>
                      )}
                      {columns.price && (
                        <p className="text-base font-bold text-brand mb-2">
                          {offer.pricing?.bundlePrices?.[0]?.unitPrice ? `€${offer.pricing.bundlePrices[0].unitPrice.toFixed(2)}` : "—"}
                        </p>
                      )}
                    </div>
                    {columns.ean && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 w-full">
                        <span className="text-[10px] text-gray-400 font-mono truncate bg-gray-50 px-1.5 py-0.5 rounded">
                          EAN: {offer.ean}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* List / Table View */
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 bg-[#f9fafc] [&>th]:font-medium">
                  <th className="py-3 px-2 w-10">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={selectedOffers.length > 0 && !allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-2 w-10">#</th>
                  {columns.title && <th className="py-3 px-2">Product</th>}
                  {columns.ean && <th className="py-3 px-2">EAN</th>}
                  {columns.price && <th className="py-3 px-2">Price</th>}
                  {columns.stock && <th className="py-3 px-2">Stock</th>}
                  {columns.condition && <th className="py-3 px-2">Condition</th>}
                  {columns.status && <th className="py-3 px-2">Live Status</th>}
                  {columns.action && <th className="py-3 px-2 text-right">Actions</th>}
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
                        isSelected ? "bg-brand/[0.03]" : ""
                      }`}
                    >
                      <td className="py-3 px-2" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelectOffer(offer)}
                        />
                      </td>
                      <td className="py-3 px-2 text-gray-500 text-xs">
                        {(page - 1) * limit + index + 1}
                      </td>
                      {columns.title && (
                        <td className="py-3 px-2 text-gray-700">
                          <div className="flex items-center gap-2">
                            <BolProductImage ean={offer.ean} className="w-8 h-8 rounded object-cover" />
                            <span className="text-gray-700 font-semibold line-clamp-1 max-w-[200px]" title={offer.store?.productTitle || offer.unknownProductTitle}>
                              {offer.store?.productTitle || offer.unknownProductTitle || "Unknown Product"}
                            </span>
                          </div>
                        </td>
                      )}
                      {columns.ean && (
                        <td className="py-3 px-2 text-gray-500 font-mono text-xs">
                          {offer.ean}
                        </td>
                      )}
                      {columns.price && (
                        <td className="py-3 px-2 font-semibold text-brand">
                          €{offer.pricing?.bundlePrices?.[0]?.unitPrice?.toFixed(2) || "—"}
                        </td>
                      )}
                      {columns.stock && (
                        <td className="py-3 px-2 text-gray-700 font-medium">
                          {offer.stock?.amount || 0} in stock
                        </td>
                      )}
                      {columns.condition && (
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                            {offer.condition?.category || "NEW"}
                          </span>
                        </td>
                      )}
                      {columns.status && (
                        <td className="py-3 px-2">
                          {isOfferForSale(offer) ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              For Sale (Live)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Not For Sale
                            </span>
                          )}
                        </td>
                      )}
                      {columns.action && (
                        <td className="py-3 px-2 text-right" onClick={e => e.stopPropagation()}>
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
          <div className="border-t border-gray-100 mt-4 pt-2">
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white px-6 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-gray-200 flex items-center gap-5 z-50 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {selectedOffers.length}
            </div>
            <span className="text-sm font-semibold text-gray-800">Offers Selected</span>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button onClick={() => setSelectedOffers([])} type="text" className="text-gray-500 hover:text-gray-800 font-medium">
              Cancel
            </Button>
            <Button
              type="default"
              className="border-gray-300 text-gray-700 hover:text-black font-semibold h-9 px-3.5 flex items-center gap-1.5 rounded-xl"
              onClick={() => setStockModalOpen(true)}
            >
              <LuBoxes size={15} className="text-blue-600" />
              Update Stock
            </Button>
            <Button
              type="default"
              loading={isBulkUpdatingStatus}
              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold h-9 px-3.5 flex items-center gap-1.5 rounded-xl"
              onClick={() => handleBulkStatusChange(false)}
            >
              <LuCheck size={14} />
              Set For Sale
            </Button>
            <Button
              type="default"
              loading={isBulkUpdatingStatus}
              className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold h-9 px-3.5 flex items-center gap-1.5 rounded-xl"
              onClick={() => handleBulkStatusChange(true)}
            >
              <LuPause size={14} />
              Pause (Not For Sale)
            </Button>
            <Button
              danger
              type="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold h-9 px-4 flex items-center gap-1.5 rounded-xl shadow-sm"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <LuTrash2 size={15} />
              Delete Selected ({selectedOffers.length})
            </Button>
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
            <Button type="primary" size="small" onClick={applyFilters} className="bg-brand">Apply</Button>
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
