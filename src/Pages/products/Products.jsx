import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input, Empty, Popover, Checkbox, Drawer, Select, Button, Slider, Rate } from "antd";
import { FiSearch, FiPlus, FiLink, FiFilter, FiEye, FiCopy } from "react-icons/fi";
import { BsGrid, BsListUl } from "react-icons/bs";
import { FaStar } from "react-icons/fa";
import { LuRefreshCw } from "react-icons/lu";
import ProductDetailsModal from "../../components/products/ProductDetailsModal";
import ConnectInventoryModal from "../../components/products/ConnectInventoryModal";
import DraftEditModal from "../../components/products/DraftEditModal";
import BulkPublishModal from "../../components/products/BulkPublishModal";
import Pagination from "../../components/shared/Pagination";
import {
  useGetProductsQuery,
  useGetFiltersMetaQuery,
  useResyncInventoryMutation,
  useGetConnectionQuery,
  useCreateDraftFromAmazonMutation,
} from "../../Redux/productApis";
import toast from "react-hot-toast";
import OfferActionMenu from "../bolListing/components/OfferActionMenu";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const Products = () => {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [page, setPage] = useState(1);
  // Remember the user's chosen page size across sessions.
  const [limit, setLimit] = useState(() => {
    const saved = Number(localStorage.getItem("products:pageSize"));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 20;
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

  const [columns, setColumns] = useState({
    serial: false, asin: false, ean: true, title: false, sheetTitle: true, category: true,
    purchasePrice: false, price: true, delivery: false,
    sheetSource: false, ratings: false, stock: true, status: true, action: true, publishAction: true
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

  const { data, isLoading, isFetching, isError } = useGetProductsQuery({
    page,
    limit,
    search: debouncedSearch,
    sortBy,
    sortOrder,
    ...activeFilters
  });
  const { data: filtersMeta } = useGetFiltersMetaQuery();
  const { data: connectionData } = useGetConnectionQuery();
  const [resync, { isLoading: isResyncing }] = useResyncInventoryMutation();

  const applyFilters = () => {
    setActiveFilters(filters);
    setPage(1);
    setFilterOpen(false);
  };

  const products = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const loading = isLoading || isFetching;

  const handleResync = async () => {
    try {
      const res = await resync().unwrap();
      toast.success(res?.message || "Inventory synced");
    } catch (err) {
      toast.error(err?.data?.detail || "Nothing connected to sync yet");
    }
  };

  const handleCopy = (e, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
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
      <div className="bg-white rounded-2xl p-5 card-shadow">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-lg font-semibold text-gray-700">
            {total} Products
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
              onClick={handleResync}
              disabled={isResyncing}
              title="Sync from spreadsheet"
              className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand disabled:opacity-50"
            >
              <LuRefreshCw size={16} className={isResyncing ? "animate-spin" : ""} />
            </button>

            <Popover
              content={
                <div className="flex flex-col gap-2 p-2">
                  {Object.keys(columns)
                    .filter(col => col !== 'serial' && col !== 'action')
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
              title="Filter products"
              className={`w-10 h-10 rounded-lg border flex items-center justify-center ${Object.keys(activeFilters).length ? 'border-brand text-brand bg-brand/5' : 'border-gray-200 text-gray-500 hover:text-brand'}`}
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
              className="w-36 h-10 custom-select"
              options={[
                { value: 'default', label: 'Default' },
                { value: 'creation-desc', label: 'Creation: Newest' },
                { value: 'creation-asc', label: 'Creation: Oldest' },
                { value: 'price-asc', label: 'Price: Low to High' },
                { value: 'price-desc', label: 'Price: High to Low' },
                { value: 'title-asc', label: 'Title: A to Z' },
                { value: 'title-desc', label: 'Title: Z to A' },
                { value: 'stock-asc', label: 'Stock: Low to High' },
                { value: 'stock-desc', label: 'Stock: High to Low' },
              ]}
            />

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView("grid")}
                className={`w-8 h-8 rounded-md flex items-center justify-center ${view === "grid" ? "bg-brand text-white" : "text-gray-400"
                  }`}
              >
                <BsGrid size={15} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`w-8 h-8 rounded-md flex items-center justify-center ${view === "list" ? "bg-brand text-white" : "text-gray-400"
                  }`}
              >
                <BsListUl size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Connect inventory banner */}
        {total > 0 ? (
          <div className="w-full flex items-center bg-[#f7f9fd] border border-blue-50/50 rounded-xl px-5 py-4 mb-5 text-left">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100/50 flex items-center justify-center text-blue-500">
                <FiLink size={18} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-gray-800 mb-0.5">
                  Connected Spreadsheet
                </p>
                <a
                  href={connectionData?.spreadsheet_url || products[0]?.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-500 hover:underline"
                >
                  {connectionData?.spreadsheet_name || "Google Sheet"}
                </a>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConnectOpen(true)}
            className="w-full flex items-center justify-between bg-[#f0f0fd] rounded-xl px-5 py-3 mb-5 text-left border border-dashed border-brand/40 hover:bg-[#e8e8fd] transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-brand">
                Connect Your Inventory
              </p>
              <p className="text-xs text-gray-500">
                Import products from a Google Spreadsheet link
              </p>
            </div>
            <span className="button-color text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-medium">
              <FiPlus size={14} /> Connect
            </span>
          </button>
        )}

        {/* States */}
        {loading ? (
          view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                  : debouncedSearch
                    ? `No products match “${debouncedSearch}”.`
                    : "No products yet. Connect your inventory to import."
              }
            />
          </div>
        ) : view === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="text-left bg-white rounded-2xl border border-gray-100/80 p-3.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-brand/20 transition-all duration-300 flex flex-col group h-full"
              >
                <div className="bg-[#f8f9fc] rounded-xl h-40 flex items-center justify-center mb-4 overflow-hidden relative group-hover:bg-[#f0f2f8] transition-colors w-full">
                  <div className="absolute top-2.5 left-2.5 z-20" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedProducts.some(item => item.id === p.id)}
                      onChange={() => toggleSelection(p)}
                      disabled={p.scrapePending || !p.title}
                      className="scale-125 bg-white/80 rounded-md backdrop-blur-sm"
                    />
                  </div>
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end z-10">
                    {columns.status && p.status && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md ${p.status?.toLowerCase() === 'online' ? 'bg-green-100/90 text-green-700' : 'bg-white/90 text-gray-700 border border-gray-100'}`}>
                        {p.status}
                      </span>
                    )}
                    {columns.stock && p.stock && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm bg-white/90 backdrop-blur-md text-gray-700 border border-gray-100">
                        {p.stock}
                      </span>
                    )}
                  </div>
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.title}
                      className="h-[85%] w-[85%] object-contain rounded-lg group-hover:scale-105 transition-transform duration-500"
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
                    <p className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-snug mb-1.5">
                      {p.title}
                    </p>
                  )}
                  {columns.sheetTitle && p.spreadsheetTitle && (
                    <p className="text-[13px] font-semibold text-gray-800 line-clamp-2 mb-1.5" title={p.spreadsheetTitle}>
                      📝 {p.spreadsheetTitle}
                    </p>
                  )}
                  {columns.category && (
                    <div className="mb-2">
                      <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium truncate max-w-full">
                        {p.category}
                      </span>
                    </div>
                  )}
                  {p.scrapePending ? (
                    <p className="text-[11px] text-amber-500 mb-2 font-medium">
                      Tap to load details
                    </p>
                  ) : (
                    <div className="flex items-center justify-between mb-2">
                      {columns.price && (
                        <p className="text-base font-bold text-brand">
                          {p.price ? `€${p.price}` : "—"}
                        </p>
                      )}
                      {columns.publishAction && (
                        p.publishStatus === 'published' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-green-50 text-green-600 border border-green-200 cursor-default">
                              Published
                            </span>
                            <OfferActionMenu offer={{ offerId: p.bol_offer_id, onHoldByRetailer: p.bol_on_hold, stock: { amount: p.bol_stock } }} />
                          </div>
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
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${p.publishStatus === 'processing'
                                ? 'bg-amber-50 text-amber-600 border border-amber-200 cursor-not-allowed'
                                : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'
                              }`}
                          >
                            {p.publishStatus === 'processing' ? 'Processing...' : 'Publish'}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 mt-auto">
                    {columns.ratings && (
                      <div className="flex items-center gap-1.5 text-[11px] mt-2">
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold">
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
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 w-full">
                    {columns.asin && (
                      <div className="flex items-center gap-1 bg-gray-50/80 px-1.5 py-1 rounded group/copy border border-gray-100">
                        <span className="text-[9px] font-semibold text-gray-400 tracking-wide">ASIN</span>
                        <span className="text-[10px] text-gray-700 font-mono truncate max-w-[75px]">{p.asin}</span>
                        <button onClick={(e) => handleCopy(e, p.asin)} className="text-gray-400 hover:text-brand opacity-0 group-hover/copy:opacity-100 transition-opacity"><FiCopy size={10} /></button>
                      </div>
                    )}
                    {columns.ean && p.ean && (
                      <div className="flex items-center gap-1 bg-gray-50/80 px-1.5 py-1 rounded group/copy border border-gray-100">
                        <span className="text-[9px] font-semibold text-gray-400 tracking-wide">EAN</span>
                        <span className="text-[10px] text-gray-700 font-mono truncate max-w-[85px]">{p.ean}</span>
                        <button onClick={(e) => handleCopy(e, p.ean)} className="text-gray-400 hover:text-brand opacity-0 group-hover/copy:opacity-100 transition-opacity"><FiCopy size={10} /></button>
                      </div>
                    )}
                    {columns.sheetSource && p.spreadsheetUrl && (
                      <a
                        href={`${p.spreadsheetUrl}${p.sheetId ? `&gid=${p.sheetId}` : ''}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand/80 hover:text-brand hover:bg-brand/5 px-2 py-0.5 rounded transition-colors flex items-center gap-1 text-[10px] whitespace-nowrap font-medium ml-auto"
                        onClick={e => e.stopPropagation()}
                      >
                        <FiLink size={10} />
                        {p.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/) ? `${p.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)[1].substring(0, 4)}..` : "Sheet"}
                      </a>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      onChange={toggleSelectAll}
                      checked={selectedProducts.length > 0 && selectedProducts.length === products.filter(p => !p.scrapePending && p.title).length}
                      indeterminate={selectedProducts.length > 0 && selectedProducts.length < products.filter(p => !p.scrapePending && p.title).length}
                    />
                  </th>
                  {columns.serial && <th className="py-3 px-2">Serial</th>}
                  {columns.asin && <th className="py-3 px-2">ASIN</th>}
                  {columns.ean && <th className="py-3 px-2">EAN</th>}
                  {columns.title && <th className="py-3 px-2">Products name</th>}
                  {columns.sheetTitle && <th className="py-3 px-2">Sheet Name</th>}
                  {columns.category && <th className="py-3 px-2">Category</th>}
                  {columns.purchasePrice && <th className="py-3 px-2">Purchase Price</th>}
                  {columns.price && <th className="py-3 px-2">Price</th>}
                  {columns.delivery && <th className="py-3 px-2">Delivery</th>}
                  {columns.sheetSource && <th className="py-3 px-2">Sheet Source</th>}
                  {columns.ratings && <th className="py-3 px-2">Ratings</th>}
                  {columns.stock && <th className="py-3 px-2">Stock</th>}
                  {columns.status && <th className="py-3 px-2">Status</th>}
                  {columns.publishAction && <th className="py-3 px-2">Publish</th>}
                  {columns.action && <th className="py-3 px-2">Action</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 hover:bg-gray-50/60"
                  >
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedProducts.some(item => item.id === p.id)}
                        onChange={() => toggleSelection(p)}
                        disabled={p.scrapePending || !p.title}
                      />
                    </td>
                    {columns.serial && <td className="py-3 px-2 text-gray-500">
                      {(page - 1) * limit + i + 1}
                    </td>}
                    {columns.asin && <td className="py-3 px-2 text-gray-500">
                      <div className="flex items-center gap-1.5 group/copy">
                        <span>{p.asin}</span>
                        <button onClick={(e) => handleCopy(e, p.asin)} className="text-gray-400 hover:text-brand opacity-0 group-hover/copy:opacity-100 transition-opacity"><FiCopy size={12} /></button>
                      </div>
                    </td>}
                    {columns.ean && <td className="py-3 px-2 text-gray-500">
                      <div className="flex items-center gap-1.5 group/copy">
                        <span>{p.ean || "—"}</span>
                        {p.ean && <button onClick={(e) => handleCopy(e, p.ean)} className="text-gray-400 hover:text-brand opacity-0 group-hover/copy:opacity-100 transition-opacity"><FiCopy size={12} /></button>}
                      </div>
                    </td>}
                    {columns.title && <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {p.image && (
                          <img
                            src={p.image}
                            alt=""
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <span className="text-gray-700 font-semibold line-clamp-1 max-w-[160px]">
                          {p.title}
                        </span>
                      </div>
                    </td>}
                    {columns.sheetTitle && <td className="py-3 px-2 text-gray-700 font-semibold">
                      <span className="line-clamp-2">{p.spreadsheetTitle || "—"}</span>
                    </td>}
                    {columns.category && <td className="py-3 px-2 text-gray-500">{p.category}</td>}
                    {columns.purchasePrice && <td className="py-3 px-2 text-gray-700">
                      {p.purchasePrice ? `€${p.purchasePrice}` : "—"}
                    </td>}
                    {columns.price && <td className="py-3 px-2 text-brand font-medium">
                      {p.price ? `€${p.price}` : "—"}
                    </td>}
                    {columns.delivery && <td className="py-3 px-2 text-gray-500">{p.deliveryTime || "—"}</td>}
                    {columns.sheetSource && <td className="py-3 px-2 text-gray-500">
                      {p.spreadsheetUrl ? (
                        <a
                          href={`${p.spreadsheetUrl}${p.sheetId ? `&gid=${p.sheetId}` : ''}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <FiLink size={12} />
                          {p.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/) ? `Doc: ${p.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)[1].substring(0, 6)}...` : "Spreadsheet"}
                        </a>
                      ) : "—"}
                    </td>}
                    {columns.ratings && <td className="py-3 px-2">
                      <span className="flex items-center gap-1 text-gray-500">
                        <FaStar className="text-yellow-400" size={11} /> {p.rating || "—"}
                      </span>
                    </td>}
                    {columns.stock && <td className="py-3 px-2 text-gray-500">{p.stock || "—"}</td>}
                    {columns.status && <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-[10px] ${p.status?.toLowerCase() === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {p.status || "—"}
                      </span>
                    </td>}
                    {columns.publishAction && <td className="py-3 px-2">
                      {p.publishStatus === 'published' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-green-50 text-green-600 border border-green-200 cursor-default">
                            Published
                          </span>
                          <OfferActionMenu offer={{ offerId: p.bol_offer_id, onHoldByRetailer: p.bol_on_hold, stock: { amount: p.bol_stock } }} />
                        </div>
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
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${
                            p.publishStatus === 'processing'
                                ? 'bg-amber-50 text-amber-600 border border-amber-200 cursor-not-allowed'
                                : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'
                            }`}
                        >
                          {p.publishStatus === 'processing' ? 'Processing...' : 'Publish'}
                        </button>
                      )}
                    </td>}
                    {columns.action && <td className="py-3 px-2">
                      <button
                        onClick={() => setSelected(p)}
                        className="text-xs px-4 py-1.5 rounded-full border border-brand/30 text-brand"
                      >
                        View
                      </button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && products.length > 0 && (
        <Pagination
          current={page}
          total={totalPages}
          onChange={setPage}
          pageSize={limit}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          totalItems={total}
        />
      )}

      <ProductDetailsModal
        open={!!selected}
        product={selected}
        onClose={() => setSelected(null)}
        onDraftCreated={(draftId) => setEditingDraftId(draftId)}
      />
      <DraftEditModal
        draftId={editingDraftId}
        onClose={() => setEditingDraftId(null)}
      />
      <ConnectInventoryModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
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
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Stock</label>
            <Select
              className="w-full"
              allowClear
              placeholder="e.g. Yes"
              value={filters.filter_stock}
              onChange={v => setFilters({ ...filters, filter_stock: v })}
              options={(filtersMeta?.stocks || []).map(s => ({ label: s, value: s }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Category</label>
            <Select
              className="w-full"
              allowClear
              showSearch
              placeholder="e.g. Projector"
              value={filters.filter_category}
              onChange={v => setFilters({ ...filters, filter_category: v })}
              options={(filtersMeta?.categories || []).map(s => ({ label: s, value: s }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Delivery Time</label>
            <Select
              className="w-full"
              allowClear
              placeholder="e.g. 3-5 days"
              value={filters.filter_delivery}
              onChange={v => setFilters({ ...filters, filter_delivery: v })}
              options={(filtersMeta?.delivery_times || []).map(s => ({ label: s, value: s }))}
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
