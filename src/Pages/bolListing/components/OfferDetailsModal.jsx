import React, { useState, useEffect } from 'react';
import { Modal, Spin, Tooltip } from 'antd';
import { useGetBolProductAssetsQuery } from '../../../Redux/productApis';
import { FiCopy, FiCheck } from 'react-icons/fi';

const OfferDetailsModal = ({ offer, insights, onClose }) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedEan, setCopiedEan] = useState(false);

  // Fetch ALL native Bol.com product photos directly from Bol.com Retailer API
  // Using currentData ensures stale data from previous modal offers is never rendered during transitions
  const { currentData: assetsData, isFetching } = useGetBolProductAssetsQuery(offer?.ean, {
    skip: !offer?.ean,
  });

  // If assetsData has arrived for the current EAN, use it; otherwise fallback to offer.image_url as initial preview
  const images = (assetsData?.images && assetsData.images.length > 0)
    ? assetsData.images
    : (offer?.image_url ? [offer.image_url] : []);

  // Reset active image index and copy state when offer changes
  useEffect(() => {
    setActiveImgIndex(0);
    setCopiedId(false);
    setCopiedEan(false);
  }, [offer?.offerId, offer?.ean]);

  const copyToClipboard = async (text, setCopiedFn) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setCopiedFn(true);
      setTimeout(() => setCopiedFn(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = String(text);
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopiedFn(true);
        setTimeout(() => setCopiedFn(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const handleCopyId = () => copyToClipboard(offer?.offerId, setCopiedId);
  const handleCopyEan = () => copyToClipboard(offer?.ean, setCopiedEan);

  // Bol offer data
  const title = offer?.store?.productTitle || offer?.unknownProductTitle || "Unknown Product";
  const price = offer?.pricing?.bundlePrices?.[0]?.unitPrice;
  const stock = offer?.stock?.amount ?? 0;
  const condition = offer?.condition?.category || "NEW";

  const forSale = (() => {
    if (Array.isArray(offer?.countryAvailabilities) && offer.countryAvailabilities.length > 0) {
      return offer.countryAvailabilities.some(c => c.forSale === true);
    }
    if (offer?.store?.visible !== undefined) {
      return Boolean(offer.store.visible);
    }
    return !offer?.onHoldByRetailer;
  })();

  // Insights metrics (commission, net payout, ratings, buy box, visits)
  const currentInsights = insights || offer?.insights || {};
  const fee = currentInsights.commission;
  const netPayout = currentInsights.net_payout ?? (price != null && fee != null ? Number((price - fee).toFixed(2)) : null);
  const buyBox = currentInsights.buy_box;
  const visits = currentInsights.visits;
  const rating = currentInsights.rating;
  const ratingCount = currentInsights.rating_count;

  return (
    <Modal
      open={!!offer}
      onCancel={onClose}
      footer={null}
      width={720}
      title={null}
      centered
      styles={{ body: { padding: 0 } }}
      destroyOnClose
    >
      <div className="p-6">
        <div className="flex gap-6 items-stretch">
          {/* Left Column: Product Gallery - stretches to match right column height perfectly */}
          <div className="w-[250px] shrink-0 flex flex-col gap-2">
            {isFetching && images.length === 0 ? (
              <div className="flex-1 min-h-[240px] rounded-xl bg-gray-50 flex flex-col items-center justify-center border border-gray-200">
                <Spin size="small" />
                <p className="text-xs text-gray-400 mt-2">Loading photos...</p>
              </div>
            ) : images.length > 0 ? (
              <>
                <div className="relative flex-1 min-h-[220px] rounded-xl overflow-hidden bg-gray-50/80 border border-gray-200 flex items-center justify-center p-3 group">
                  <img
                    src={images[activeImgIndex] || images[0]}
                    alt={`bol-asset-${activeImgIndex}`}
                    className="max-h-full max-w-full object-contain mx-auto transition-transform duration-200 group-hover:scale-105"
                  />
                  {images.length > 1 && (
                    <>
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium tabular-nums">
                        {activeImgIndex + 1} / {images.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveImgIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 shadow border border-gray-200 text-gray-700 text-sm font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImgIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 shadow border border-gray-200 text-gray-700 text-sm font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none shrink-0">
                    {images.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImgIndex(i)}
                        className={`w-11 h-11 rounded-lg overflow-hidden border p-0.5 shrink-0 transition-all cursor-pointer bg-white ${
                          activeImgIndex === i ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={url} alt={`thumb-${i}`} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 min-h-[240px] rounded-xl bg-gray-50 flex items-center justify-center border border-gray-200">
                <p className="text-xs text-gray-400">No images available</p>
              </div>
            )}
          </div>

          {/* Right Column: Information & Metrics */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Product Title */}
              <h2 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 mb-2.5" title={title}>
                {title}
              </h2>

              {/* Status & Identifiers Row 1: Live Status & EAN (with copy button) */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2 text-xs">
                {/* Live / Status Chip */}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-gray-200 rounded-md text-[11px] font-medium text-gray-700 bg-white">
                  <span className={`w-1.5 h-1.5 rounded-full ${forSale ? "bg-emerald-500" : "bg-gray-400"}`} />
                  {forSale ? "Live for sale" : "Not for sale"}
                </span>

                {/* EAN Copy Chip */}
                {offer?.ean && (
                  <Tooltip title={copiedEan ? "Copied EAN!" : "Click to copy EAN"}>
                    <button
                      type="button"
                      onClick={handleCopyEan}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-gray-200 hover:border-gray-300 rounded-md text-[11px] font-mono text-gray-600 hover:text-gray-900 bg-white transition-colors cursor-pointer group"
                    >
                      <span className="text-gray-400 font-sans">EAN</span>
                      <span>{offer.ean}</span>
                      {copiedEan ? (
                        <FiCheck className="text-emerald-600 text-xs shrink-0" />
                      ) : (
                        <FiCopy className="text-gray-400 group-hover:text-gray-600 text-xs shrink-0" />
                      )}
                    </button>
                  </Tooltip>
                )}

                {/* Customer Rating (if present) */}
                {rating != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-gray-200 rounded-md text-[11px] font-medium text-gray-700 bg-white">
                    <span className="text-amber-500 text-xs leading-none">★</span>
                    <span className="tabular-nums">{rating}</span>
                    {ratingCount != null && <span className="text-gray-400 text-[10px]">({ratingCount})</span>}
                  </span>
                )}
              </div>

              {/* Row 2: Full Offer ID with Copy Button */}
              {offer?.offerId && (
                <div className="mb-3">
                  <Tooltip title={copiedId ? "Copied Offer ID!" : "Click to copy Offer ID"}>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="w-full inline-flex items-center justify-between px-2.5 py-1 border border-gray-200 hover:border-gray-300 rounded-md text-[11px] font-mono text-gray-600 hover:text-gray-900 bg-white transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-gray-400 font-sans font-medium text-[10px] uppercase tracking-wider">ID</span>
                        <span className="select-all tracking-tight">{offer.offerId}</span>
                      </div>
                      {copiedId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-sans font-medium shrink-0 ml-2">
                          <FiCheck className="text-xs" /> Copied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 group-hover:text-gray-600 font-sans shrink-0 ml-2">
                          <FiCopy className="text-xs" /> Copy
                        </span>
                      )}
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>

            {/* Unified Economics & Listing Card */}
            <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 mt-auto">
              {/* Row 1: Unit Economics (Bol Price, Fee, Net Payout) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Bol Price</span>
                  <span className="text-xl font-bold text-gray-900 tracking-tight tabular-nums">
                    {price != null ? `€${price.toFixed(2)}` : "—"}
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">Listed price</span>
                </div>

                <div className="border-l border-gray-200 pl-3">
                  <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Bol Fee</span>
                  <span className="text-xl font-bold text-gray-900 tracking-tight tabular-nums">
                    {fee != null ? `€${fee.toFixed(2)}` : "—"}
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    {price && fee != null ? `${((fee / price) * 100).toFixed(0)}% fee` : "Bol fee"}
                  </span>
                </div>

                <div className="border-l border-gray-200 pl-3">
                  <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Net Payout</span>
                  <span className="text-xl font-bold text-gray-900 tracking-tight tabular-nums">
                    {netPayout != null ? `€${netPayout.toFixed(2)}` : (price != null ? `€${price.toFixed(2)}` : "—")}
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    {netPayout && price ? `${((netPayout / price) * 100).toFixed(0)}% payout` : "Est. payout"}
                  </span>
                </div>
              </div>

              {/* Row 2: Operational & Market Metrics (Stock, Condition, Buy Box, Traffic) */}
              <div className="grid grid-cols-4 gap-2 pt-3 mt-3 border-t border-gray-200">
                <div>
                  <span className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">Stock</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block tabular-nums">
                    {stock} <span className="text-xs font-normal text-gray-400">units</span>
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">Condition</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block capitalize">
                    {condition?.toLowerCase()}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">Buy Box</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block tabular-nums">
                    {buyBox != null ? `${buyBox}%` : (forSale ? "—" : "0%")}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">Traffic</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block tabular-nums">
                    {visits != null ? `${visits.toLocaleString()}/mo` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OfferDetailsModal;
