import React, { useState, useEffect } from "react";
import { useGetBolOffersQuery } from "../../Redux/productApis";
import { Empty, Spin, Tag, Input, Drawer, Select, Button, Slider, Rate } from "antd";
import { LuRefreshCw } from "react-icons/lu";
import { FiSearch, FiFilter } from "react-icons/fi";
import { BsGrid, BsListUl } from "react-icons/bs";
import Pagination from "../../components/shared/Pagination";
import BolProductImage from "./BolProductImage";

const BolListing = () => {
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [limit, setLimit] = useState(50);
  
  const [filters, setFilters] = useState({});
  const [activeFilters, setActiveFilters] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);

  // Debounce search and reset pagination
  useEffect(() => {
    const t = setTimeout(() => {
      if (debouncedSearch !== search) {
        setDebouncedSearch(search);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);
  
  const applyFilters = () => {
    setActiveFilters(filters);
    setPage(1);
    setFilterOpen(false);
  };

  const { data, isLoading, isFetching, refetch, isError } = useGetBolOffersQuery({
    page: page,
    limit: limit,
    search: debouncedSearch,
    ...activeFilters
  });

  const offers = data?.data || [];
  const totalItems = data?.total_items || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const handlePageSizeChange = (size) => {
    setLimit(size);
    setPage(1);
  };

  return (
    <div className="bg-white rounded-2xl p-5 card-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-lg font-semibold text-gray-700">
          Bol.com Offers
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<FiSearch className="text-gray-400 mr-1" />}
            placeholder="Search by EAN..."
            className="h-10 rounded-lg w-full sm:w-64"
          />
          <button
            onClick={refetch}
            title="Refresh from Bol.com"
            className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand disabled:opacity-50"
          >
            <LuRefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
          
          <button
            onClick={() => setFilterOpen(true)}
            title="Filter offers"
            className={`w-10 h-10 rounded-lg border flex items-center justify-center ${Object.keys(activeFilters).length ? 'border-brand text-brand bg-brand/5' : 'border-gray-200 text-gray-500 hover:text-brand'}`}
          >
            <FiFilter size={16} />
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

      {/* Main Content Area */}
      <div>

        {/* List View */}
        <div className="overflow-x-auto thin-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Spin size="large" />
            </div>
          ) : isError ? (
            <div className="flex justify-center items-center h-64 text-red-500">
              Failed to load offers from Bol.com. Ensure your API keys are valid.
            </div>
          ) : offers.length === 0 ? (
            <div className="py-20">
              <Empty 
                description={<span className="text-gray-400">No active offers found on Bol.com</span>}
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
              />
            </div>
          ) : view === "grid" ? (
            /* Grid view */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {offers.map((offer, index) => (
                <div
                  key={offer.offerId}
                  className="text-left bg-white rounded-2xl border border-gray-100/80 p-3.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-brand/20 transition-all duration-300 flex flex-col group h-full"
                >
                  <div className="bg-[#f8f9fc] rounded-xl h-40 flex items-center justify-center mb-4 overflow-hidden relative group-hover:bg-[#f0f2f8] transition-colors w-full">
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end z-10">
                      {offer.onHoldByRetailer ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md bg-white/90 text-amber-600 border border-amber-100">
                          ON HOLD
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md bg-green-100/90 text-green-700">
                          LIVE
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm bg-white/90 backdrop-blur-md text-gray-700 border border-gray-100">
                        Stock: {offer.stock?.amount || 0}
                      </span>
                    </div>
                    <BolProductImage 
                      ean={offer.ean} 
                      className="h-[85%] w-[85%] object-contain rounded-lg group-hover:scale-105 transition-transform duration-500 bg-transparent" 
                    />
                  </div>
                  
                  <div className="flex flex-col flex-grow w-full">
                    <p className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-snug mb-1.5" title={offer.store?.productTitle || offer.unknownProductTitle}>
                      {offer.store?.productTitle || offer.unknownProductTitle || "Unknown Product"}
                    </p>
                    <div className="mb-2">
                      <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium truncate max-w-full">
                        {offer.condition?.category || "NEW"}
                      </span>
                    </div>
                    <p className="text-base font-bold text-brand mb-2">
                      {offer.pricing?.bundlePrices?.[0]?.unitPrice ? `€${offer.pricing.bundlePrices[0].unitPrice.toFixed(2)}` : "—"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 w-full">
                    <span className="text-[10px] text-gray-400 font-mono truncate bg-gray-50 px-1.5 py-0.5 rounded">
                      EAN: {offer.ean}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 bg-[#f9fafc] [&>th]:font-medium">
                  <th className="py-3 px-2">#</th>
                  <th className="py-3 px-2">Product</th>
                  <th className="py-3 px-2">EAN</th>
                  <th className="py-3 px-2">Price</th>
                  <th className="py-3 px-2">Stock</th>
                  <th className="py-3 px-2">Condition</th>
                  <th className="py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer, index) => (
                  <tr 
                    key={offer.offerId} 
                    className="border-b border-gray-50 hover:bg-gray-50/60"
                  >
                    <td className="py-3 px-2 text-gray-500">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="py-3 px-2 text-gray-700">
                      <div className="flex items-center gap-2">
                        <BolProductImage ean={offer.ean} className="w-8 h-8 rounded object-cover" />
                        <span className="text-gray-700 line-clamp-1 max-w-[200px]" title={offer.store?.productTitle || offer.unknownProductTitle}>
                          {offer.store?.productTitle || offer.unknownProductTitle || "Unknown Product"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-500">
                      {offer.ean}
                    </td>
                    <td className="py-3 px-2 font-semibold text-brand">
                      €{offer.pricing?.bundlePrices?.[0]?.unitPrice?.toFixed(2) || "N/A"}
                    </td>
                    <td className="py-3 px-2">
                      {offer.stock?.amount || 0}
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                        {offer.condition?.category || "NEW"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {offer.onHoldByRetailer ? (
                         <Tag color="warning" className="border-0">ON HOLD</Tag>
                      ) : (
                         <Tag color="processing" className="border-0">LIVE</Tag>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && !isError && offers.length > 0 && (
          <div className="border-t border-gray-100 mt-2">
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

      <Drawer
        title="Filter Offers"
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
              onChange={v => setFilters({...filters, filter_status: v})}
              options={[{label: 'Online', value: 'Online'}, {label: 'Offline (On Hold)', value: 'Offline'}]}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Stock</label>
            <Select 
              className="w-full"
              allowClear
              placeholder="e.g. Yes"
              value={filters.filter_stock}
              onChange={v => setFilters({...filters, filter_stock: v})}
              options={[{label: 'Yes (In Stock)', value: 'Yes'}, {label: 'No (Out of Stock)', value: 'No'}]}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Category</label>
            <Select 
              className="w-full"
              allowClear
              disabled
              placeholder="Not supported for Bol Offers"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Delivery Time</label>
            <Select 
              className="w-full"
              allowClear
              disabled
              placeholder="Not supported for Bol Offers"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-600">Price Range (€)</label>
              <span className="text-[10px] text-gray-400">
                {filters.filter_min_price ?? 0} - {filters.filter_max_price ?? 1000}
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

export default BolListing;
