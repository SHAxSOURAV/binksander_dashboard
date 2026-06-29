import React from 'react';
import { Modal, Spin, Tag, Carousel, Divider } from 'antd';
import { useGetGtinToAsinQuery, useScrapeAsinQuery } from '../../../Redux/productApis';
import BolProductImage from '../BolProductImage';

const OfferDetailsModal = ({ offer, onClose }) => {
  const draftDetails = offer?.draftDetails;

  // 1. Fetch ASIN from EAN (skip if we already have it from draft)
  const { data: asinData, isFetching: asinFetching } = useGetGtinToAsinQuery(offer?.ean, {
    skip: !offer?.ean || !!offer?.asin
  });
  
  const products = asinData?.data?.products || [];
  const asin = offer?.asin || asinData?.data?.asin || products[0]?.asin || null;

  // 2. Fetch full Amazon Details using ASIN (skip if we have draftDetails)
  const { data: scrapedData, isFetching: amzFetching } = useScrapeAsinQuery({ asin, country: 'NL' }, {
    skip: !asin || !!draftDetails
  });

  const amzData = draftDetails || scrapedData;
  const isLoading = (!draftDetails && asinFetching) || amzFetching;
  
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
      width={700}
      title={null}
      centered
      styles={{ body: { padding: 0 } }}
      destroyOnClose
    >
      <div className="p-6">
        <div className="flex gap-6 mb-6">
          <div className="w-1/3 shrink-0">
            {amzData?.photos?.length > 0 ? (
              <Carousel autoplay effect="fade">
                {amzData.photos.map((url, i) => (
                  <div key={i} className="h-48 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img src={url} alt={`product-${i}`} className="max-h-full max-w-full object-contain mx-auto" />
                  </div>
                ))}
              </Carousel>
            ) : (
              <div className="h-48 rounded-xl bg-gray-50 flex items-center justify-center">
                 <BolProductImage ean={offer?.ean} className="max-h-[90%] max-w-[90%] object-contain" />
              </div>
            )}
          </div>
          
          <div className="w-2/3 flex flex-col justify-start">
            <h2 className="text-lg font-bold text-gray-800 leading-snug mb-2">{title}</h2>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-semibold">
                EAN: {offer?.ean}
              </span>
              {asin && (
                <span className="px-2.5 py-1 bg-brand/10 text-brand rounded-md text-xs font-semibold">
                  ASIN: {asin}
                </span>
              )}
              {offer?.onHoldByRetailer ? (
                 <Tag color="warning" className="m-0 border-0">ON HOLD</Tag>
              ) : (
                 <Tag color="processing" className="m-0 border-0">LIVE</Tag>
              )}
            </div>

            <div className="flex items-end gap-4 mb-2 mt-auto">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase mb-0.5">Bol Price</p>
                <p className="text-2xl font-black text-brand m-0">€{price?.toFixed(2) || "N/A"}</p>
              </div>
              <Divider type="vertical" className="h-8 border-gray-200" />
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase mb-0.5">Stock</p>
                <p className="text-xl font-bold text-gray-700 m-0">{stock}</p>
              </div>
              <Divider type="vertical" className="h-8 border-gray-200" />
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase mb-0.5">Condition</p>
                <p className="text-xl font-bold text-gray-700 m-0">{condition}</p>
              </div>
            </div>
          </div>
        </div>
        
        <Divider className="my-4" />
        
        <div className="min-h-[150px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Spin size="large" />
              <p className="text-gray-500 mt-4 text-sm">Fetching enriched details from Amazon...</p>
            </div>
          ) : (
            <>
              {amzData ? (
                <div className="flex flex-col gap-5">
                  {amzData.features?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-800 mb-2 uppercase">About this product</h3>
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                        {amzData.features.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {amzData.description && !amzData.features?.length && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-800 mb-2 uppercase">Description</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{amzData.description}</p>
                    </div>
                  )}
                  
                  {amzData.specs && Object.keys(amzData.specs).length > 0 && (
                    <div>
                       <h3 className="text-xs font-bold text-gray-800 mb-2 uppercase">Specifications</h3>
                       <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                          {Object.entries(amzData.specs).map(([k, v]) => (
                            <React.Fragment key={k}>
                              <div className="font-semibold text-gray-600 truncate" title={k}>{k}</div>
                              <div className="text-gray-800 break-words line-clamp-2" title={v}>{v}</div>
                            </React.Fragment>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>Could not fetch additional details for this product.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OfferDetailsModal;
