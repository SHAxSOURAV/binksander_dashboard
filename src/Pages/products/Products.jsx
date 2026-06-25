import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input, Empty } from "antd";
import { FiSearch, FiPlus, FiLink } from "react-icons/fi";
import { BsGrid, BsListUl } from "react-icons/bs";
import { FaStar } from "react-icons/fa";
import { LuRefreshCw } from "react-icons/lu";
import ProductDetailsModal from "../../components/products/ProductDetailsModal";
import ConnectInventoryModal from "../../components/products/ConnectInventoryModal";
import Pagination from "../../components/shared/Pagination";
import {
  useGetProductsQuery,
  useResyncInventoryMutation,
} from "../../Redux/productApis";
import toast from "react-hot-toast";

const PAGE_SIZE_OPTIONS = [12, 24, 50, 100];

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
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 50;
  });
  const [selected, setSelected] = useState(null);
  const [connectOpen, setConnectOpen] = useState(false);

  // Adopt a search term coming from the URL (e.g. the global navbar search).
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  // Debounce the search box and reset to page 1 when the term changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handlePageSizeChange = (size) => {
    setLimit(size);
    setPage(1);
    localStorage.setItem("products:pageSize", String(size));
  };

  const { data, isLoading, isFetching, isError } = useGetProductsQuery({
    page,
    limit,
    search: debouncedSearch,
  });
  const [resync, { isLoading: isResyncing }] = useResyncInventoryMutation();

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

  return (
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
          <button
            onClick={() => setConnectOpen(true)}
            title="Connect inventory"
            className="button-color w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          >
            <FiPlus size={18} />
          </button>
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

      {/* Connect inventory banner */}
      <button
        onClick={() => setConnectOpen(true)}
        className="w-full flex items-center justify-between bg-[#f0f0fd] rounded-xl px-5 py-3 mb-5 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-brand">
            Connect Your Inventory
          </p>
          <p className="text-xs text-gray-400">
            Import products from a Google Spreadsheet link
          </p>
        </div>
        <span className="button-color text-xs px-4 py-2 rounded-lg flex items-center gap-2">
          <FiLink size={13} /> Connect
        </span>
      </button>

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
              className="text-left rounded-xl border border-gray-100 p-3 hover:shadow-md transition"
            >
              <div className="bg-[#f7f8fc] rounded-lg h-32 flex items-center justify-center mb-3 overflow-hidden">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.title}
                    className="h-full w-full object-contain rounded-lg"
                  />
                ) : p.scrapePending ? (
                  <span className="text-gray-300 text-[11px] animate-pulse">
                    Syncing…
                  </span>
                ) : (
                  <span className="text-gray-300 text-xs">No image</span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-700 line-clamp-2 mb-1">
                {p.title}
              </p>
              {p.scrapePending ? (
                <p className="text-[11px] text-amber-500 mb-1">
                  Tap to load details
                </p>
              ) : (
                <p className="text-sm font-bold text-brand mb-1">
                  {p.price ? `€${p.price}` : "—"}
                </p>
              )}
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <FaStar className="text-yellow-400" size={11} />
                {p.rating || "—"} · {p.reviews} Reviews
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 bg-[#f9fafc] [&>th]:font-medium">
                <th className="py-3 px-2">Serial</th>
                <th className="py-3 px-2">ASIN</th>
                <th className="py-3 px-2">Products name</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Price</th>
                <th className="py-3 px-2">Ratings</th>
                <th className="py-3 px-2">Stock</th>
                <th className="py-3 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 hover:bg-gray-50/60"
                >
                  <td className="py-3 px-2 text-gray-500">
                    {(page - 1) * limit + i + 1}
                  </td>
                  <td className="py-3 px-2 text-gray-500">{p.asin}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {p.image && (
                        <img
                          src={p.image}
                          alt=""
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <span className="text-gray-700 line-clamp-1 max-w-[160px]">
                        {p.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{p.category}</td>
                  <td className="py-3 px-2 text-gray-700">
                    {p.price ? `€${p.price}` : "—"}
                  </td>
                  <td className="py-3 px-2">
                    <span className="flex items-center gap-1 text-gray-500">
                      <FaStar className="text-yellow-400" size={11} /> {p.rating || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{p.stock || "—"}</td>
                  <td className="py-3 px-2">
                    <button
                      onClick={() => setSelected(p)}
                      className="text-xs px-4 py-1.5 rounded-full border border-brand/30 text-brand"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
      />
      <ConnectInventoryModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
      />
    </div>
  );
};

// Placeholder card shown while a page of products is loading.
const ProductCardSkeleton = () => (
  <div className="rounded-xl border border-gray-100 p-3 animate-pulse">
    <div className="bg-gray-100 rounded-lg h-32 mb-3" />
    <div className="h-3 bg-gray-100 rounded w-5/6 mb-2" />
    <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
    <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
  </div>
);

// Placeholder rows shown while a page of the list view is loading.
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
