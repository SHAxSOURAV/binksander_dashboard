import React, { useState, useEffect } from 'react';
import { Modal, Spin, Tag, Divider } from 'antd';
import { useGetBolProductAssetsQuery } from '../../../Redux/productApis';

const OfferDetailsModal = ({ offer, onClose }) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Fetch ALL native Bol.com product photos directly from Bol.com Retailer API (/products/{ean}/assets)
  const { data: assetsData, isLoading } = useGetBolProductAssetsQuery(offer?.ean, {
    skip: !offer?.ean
  });

  const images = assetsData?.images || [];

  // Reset active image index when offer or images change
  useEffect(() => {
    setActiveImgIndex(0);
  }, [offer?.ean, assetsData]);

  // Bol data
  const title = offer?.store?.productTitle || offer?.unknownProductTitle || "Unknown Product";
  const price = offer?.pricing?.bundlePrices?.[0]?.unitPrice;
  const stock = offer?.stock?.amount || 0;
  const condition = offer?.condition?.category || "NEW";

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
        <div className="flex gap-6">
          <div className="w-2/5 shrink-0 flex flex-col gap-2.5">
            {isLoading ? (
              <div className="h-60 rounded-2xl bg-gray-50 flex flex-col items-center justify-center border border-gray-100">
                <Spin />
                <p className="text-xs text-gray-400 mt-2">Loading Bol.com images...</p>
              </div>
            ) : images.length > 0 ? (
              <>
                <div className="relative h-60 rounded-2xl overflow-hidden bg-gray-50/80 border border-gray-100 flex items-center justify-center p-2 shadow-inner group">
                  <img
                    src={images[activeImgIndex] || images[0]}
                    alt={`bol-asset-${activeImgIndex}`}
                    className="max-h-full max-w-full object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
                  />
                  {images.length > 1 && (
                    <>
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold shadow-sm">
                        {activeImgIndex + 1} / {images.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveImgIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md text-gray-800 font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 active:scale-95"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImgIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md text-gray-800 font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 active:scale-95"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {images.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImgIndex(i)}
                        className={`w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                          activeImgIndex === i ? "border-brand shadow-md scale-105" : "border-gray-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-60 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                <p className="text-xs text-gray-400">No images available</p>
              </div>
            )}
          </div>

          <div className="w-3/5 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800 leading-snug mb-3">{title}</h2>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">
                  EAN: {offer?.ean}
                </span>
                {offer?.offerId && (
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold truncate max-w-[200px]" title={offer?.offerId}>
                    ID: {offer?.offerId}
                  </span>
                )}
                {offer?.onHoldByRetailer ? (
                  <Tag color="warning" className="m-0 border-0 font-semibold px-2 py-0.5 rounded-md">ON HOLD</Tag>
                ) : (
                  <Tag color="success" className="m-0 border-0 font-semibold px-2 py-0.5 rounded-md">LIVE</Tag>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 bg-gray-50/90 p-4 rounded-2xl border border-gray-100 mt-auto shadow-sm">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Bol Price</p>
                <p className="text-2xl font-black text-brand m-0">€{price?.toFixed(2) || "N/A"}</p>
              </div>
              <Divider type="vertical" className="h-8 border-gray-200" />
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Stock</p>
                <p className="text-xl font-bold text-gray-800 m-0">{stock}</p>
              </div>
              <Divider type="vertical" className="h-8 border-gray-200" />
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Condition</p>
                <p className="text-sm font-bold text-gray-700 m-0">{condition}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OfferDetailsModal;
