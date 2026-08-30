import { useState, useEffect, useMemo } from "react";
import { Modal, Input, Select, Spin, Tabs } from "antd";
import toast from "react-hot-toast";
import { FaStar, FaCheckCircle, FaAmazon, FaTruck, FaUndoAlt, FaCrown } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import { LuShieldCheck } from "react-icons/lu";
import {
  useCreateDraftFromAmazonMutation,
  usePublishDraftMutation,
  useScrapeAsinQuery,
  useSyncAsinMutation,
  useUpdateDraftMutation,
  useTranslateDraftImagesMutation,
  useGetLiveDeliveryQuery,
  useRevalidateProductsContentMutation,
} from "../../Redux/productApis";
import { getSafeAmazonUrl } from "../../utils/urlUtils";

// Helper for .95 rounding rule with €39.95 floor price
const calcSellingPrice = (purchasePrice, multiplier = 2.5) => {
  const raw = Number(purchasePrice) || 0;
  if (!raw || raw <= 0) return 39.95;
  const base = raw * multiplier;
  const rounded = Math.floor(base / 10) * 10 + 9.95;
  return Math.max(39.95, Math.round(rounded * 100) / 100);
};

// Parse a price that may use a comma as the decimal separator (e.g. "19,53")
// into a JS number. Returns null when it can't be parsed.
const parsePrice = (val) => {
  if (val == null || val === "") return null;
  const num = parseFloat(
    String(val)
      .replace(/[^\d.,]/g, "")
      .replace(",", "."),
  );
  return Number.isFinite(num) ? num : null;
};

// Format a number as a price string using a "." decimal separator.
const formatPrice = (num) => (num == null ? "" : num.toFixed(2));

const calculateDeliveryDays = (deliveryStr) => {
  if (!deliveryStr || typeof deliveryStr !== "string") return "3-5 Days";

  const monthMap = {
    januari: 0, january: 0, jan: 0,
    februari: 1, february: 1, feb: 1,
    maart: 2, march: 2, mar: 2,
    april: 3, apr: 3,
    mei: 4, may: 4,
    juni: 5, june: 5, jun: 5,
    juli: 6, july: 6, jul: 6,
    augustus: 7, august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    oktober: 9, october: 9, okt: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };

  const match1 = deliveryStr.match(/(\d{1,2})\s+([a-zA-Z]{3,10})/);
  const match2 = deliveryStr.match(/([a-zA-Z]{3,10})\s+(\d{1,2})/);

  let day = null;
  let monthStr = null;

  if (match1) {
    day = parseInt(match1[1], 10);
    monthStr = match1[2].toLowerCase();
  } else if (match2) {
    day = parseInt(match2[2], 10);
    monthStr = match2[1].toLowerCase();
  }

  if (day && monthStr && monthMap[monthStr] !== undefined) {
    const now = new Date();
    const targetMonth = monthMap[monthStr];
    let targetYear = now.getFullYear();

    if (targetMonth < now.getMonth() - 1) {
      targetYear += 1;
    }

    const targetDate = new Date(targetYear, targetMonth, day);
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = targetDate.getTime() - todayZero.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      return `${diffDays} Days`;
    } else if (diffDays === 1) {
      return "1 Day";
    } else if (diffDays === 0) {
      return "Same Day";
    }
  }

  const daysMatch = deliveryStr.match(/(\d+)\s*(?:dagen|days|d)/i);
  if (daysMatch) {
    return `${daysMatch[1]} Days`;
  }

  return "3-5 Days";
};

const ProductDetailsModal = ({ open, onClose, product, onDraftCreated, onOpenDraftModal }) => {
  const [activeImage, setActiveImage] = useState("");
  const [useSheetTitle, setUseSheetTitle] = useState(false);
  const [createDraft, { isLoading: drafting }] = useCreateDraftFromAmazonMutation();
  const [publishDraft, { isLoading: publishing }] = usePublishDraftMutation();
  const [syncAsin, { isLoading: isSyncing }] = useSyncAsinMutation();
  const [updateDraft] = useUpdateDraftMutation();

  // Live-scrape the full Amazon product (all photos, description) for this ASIN.
  const { data: details, isFetching: loadingDetails } = useScrapeAsinQuery(
    { asin: product?.asin, country: "NL" },
    { skip: !open || !product?.asin },
  );

  // Live delivery details in Dutch
  const { data: liveDeliveryRes } = useGetLiveDeliveryQuery(product?.asin, {
    skip: !open || !product?.asin,
  });

  // Merge scraped detail over the list-row data; scrape wins when present.
  const view = useMemo(() => {
    const photos =
      details?.photos?.length > 0
        ? details.photos
        : [product?.image].filter(Boolean);
    const amazonNum = parsePrice(details?.price ?? product?.amazonPrice);
    
    const amazonTitle = details?.title || product?.title || "";
    const sheetTitle = product?.spreadsheetTitle || amazonTitle;
    const finalTitle = useSheetTitle ? sheetTitle : amazonTitle;

    // The catalog row already carries the price the backend computed with this
    // account's multiplier — prefer it so the modal can't disagree with the card.
    // Only fall back to a local calculation (using the same multiplier) when the
    // row has no server price, e.g. an unscraped item.
    const serverPrice = parsePrice(product?.price);
    const calculatedPrice =
      serverPrice && serverPrice > 0
        ? serverPrice
        : calcSellingPrice(amazonNum, product?.priceMultiplier ?? 2.5);

    return {
      amazonTitle,
      sheetTitle,
      title: finalTitle,
      brand: details?.brand || product?.brand || "",
      description: details?.description || product?.description || "",
      amazonPrice: formatPrice(amazonNum),
      price: formatPrice(calculatedPrice),
      originalPrice: details?.originalPrice || "",
      rating: details?.rating || product?.rating || "",
      reviews: details?.reviews || product?.reviews || 0,
      productUrl: details?.productUrl || product?.productUrl || "",
      category: product?.category || "",
      mainImage: details?.mainImage || product?.image || "",
      photos,
      delivery: liveDeliveryRes?.live_delivery_dutch || details?.delivery || "Bezorging Vrijdag, 8 Augustus",
      isPrime: details?.isPrime || false,
      isAmazonChoice: details?.isAmazonChoice || false,
      isBestSeller: details?.isBestSeller || false,
      specs: details?.specs || {},
      features: details?.features || [],
      returnPolicy: details?.returnPolicy || "Standaard Retourbeleid",
    };
  }, [details, product, useSheetTitle, liveDeliveryRes]);

  // Editable "Your Price"; defaults to the 2.5x markup and resets when the
  // computed value changes (new product / scrape result).
  const [yourPrice, setYourPrice] = useState("");
  useEffect(() => {
    setYourPrice(view.price);
  }, [view.price]);

  useEffect(() => {
    if (open) setActiveImage("");
  }, [open, product?.asin]);

  if (!product) return null;

  const mainImage = activeImage || view.mainImage;

  // Create a Bol.com draft from the Amazon ASIN (2.5x markup), then publish it.
  const handlePublish = async () => {
    if (!product.asin) {
      toast.error("This product has no ASIN to publish.");
      return;
    }
    try {
      const draftRes = await createDraft({
        asin: product.asin,
        country: "NL",
        stock_amount: 10,
        condition: "NEW",
        delivery_code: "1-8d",
        estimated_price: parsePrice(yourPrice) || parsePrice(view.price),
      }).unwrap();
      const draftId = draftRes?.data?.id;
      if (!draftId) throw new Error("Draft was not created");
      
      // If using the sheet title, immediately update the draft with it
      if (useSheetTitle) {
        await updateDraft({ id: draftId, title: view.title }).unwrap();
      }
      
      toast.success("Draft created successfully");
      onClose();
      const openDraftFn = onOpenDraftModal || onDraftCreated;
      if (openDraftFn) openDraftFn(draftId);
    } catch (err) {
      toast.error(
        err?.data?.detail || err?.message || "Failed to create draft",
      );
    }
  };

  const busy = drafting || publishing;

  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={960} className="product-modal">
      <div className="font-poppins pt-1 pb-2">
        
        {/* Header Section */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="pr-4 w-full">
            <div className="flex items-center gap-3 mb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
               <span className="border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{view.brand || "Brand"}</span>
               <span className="text-gray-300">•</span>
               <span className="text-gray-400">ASIN: {product?.asin}</span>
            </div>
            <div className="flex items-start justify-between gap-4 pr-2">
              <h2 className="text-[15px] font-semibold text-gray-900 leading-snug mb-2">
                {view.title || "Product Details"}
              </h2>
              {view.amazonTitle && view.sheetTitle && view.amazonTitle !== view.sheetTitle && (
                <button
                  onClick={() => setUseSheetTitle(!useSheetTitle)}
                  className="flex items-center gap-1.5 flex-shrink-0 text-[10px] font-medium text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-900 px-2 py-0.5 rounded transition-colors mt-0.5"
                  title="Swap Title Source"
                >
                  <FiRefreshCw size={11} />
                  {useSheetTitle ? "Sheet Title" : "Amazon Title"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-5 text-sm">
               <div className="flex items-center gap-1 text-gray-600 text-[11px] font-medium">
                  <FaStar className="text-gray-400 mb-[1px]" size={11} />
                  <span>{view.rating || "—"}</span>
               </div>
               <span className="text-gray-400 text-[11px]">
                 {view.reviews} reviews
               </span>
               
               {product?.asin && (
                <button
                  onClick={async () => {
                    try {
                      await syncAsin({ asin: product.asin, country: "NL" }).unwrap();
                      toast.success("Successfully synced ASIN");
                    } catch (err) {
                      toast.error(err?.data?.detail || "Failed to sync ASIN");
                    }
                  }}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 transition-colors disabled:opacity-50 font-medium px-2.5 py-1 rounded text-[11px] ml-auto"
                >
                  <FiRefreshCw className={isSyncing ? "animate-spin" : ""} size={12} />
                  {isSyncing ? "Syncing..." : "Sync Latest Data"}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
           
           {/* Left Column: Tabs for Details */}
           <div className="md:col-span-7 lg:col-span-8 flex flex-col">
              <Tabs 
                 defaultActiveKey="1" 
                 className="custom-tabs"
                 items={[
                   {
                     key: '1',
                     label: 'Overview',
                     children: (
                       <div className="space-y-6 mt-4">
                         
                         {/* Pricing Setup */}
                         <div className="p-3 rounded border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <div className="w-full sm:w-auto">
                              <p className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Amazon price</p>
                              <div className="flex items-end gap-2.5">
                                 <span className="text-xl font-semibold text-gray-900 tabular-nums">
                                   {view.amazonPrice ? `€${view.amazonPrice}` : "—"}
                                 </span>
                                 {view.originalPrice && (
                                   <span className="text-sm font-medium text-gray-400 line-through mb-1.5">{view.originalPrice}</span>
                                 )}
                              </div>
                            </div>
                            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                            <div className="flex-1 w-full sm:w-auto">
                              <p className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Your selling price</p>
                              <Input
                                value={yourPrice ? `€${yourPrice}` : ""}
                                onChange={(e) => setYourPrice(e.target.value.replace(/^€/, ""))}
                                className="h-9 text-[15px] font-semibold text-gray-900 tabular-nums px-3"
                              />
                            </div>
                         </div>
                         
                         {/* Delivery & Logistics */}
                         <div className="border border-gray-200 rounded p-3">
                            <h3 className="text-[10px] font-semibold text-gray-400 mb-2.5 uppercase tracking-wider">LOGISTICS & RETURNS</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className="flex items-start gap-3">
                                 <div className="mt-0.5 text-gray-400"><FaTruck size={13} /></div>
                                 <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <p className="text-[13px] font-semibold text-gray-800">Delivery Details</p>
                                      <span className="inline-flex px-1.5 py-0.5 border border-gray-200 text-gray-600 font-medium text-[10px] rounded">
                                        {view.deliveryDays}
                                      </span>
                                   </div>
                                   <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">{view.delivery || "Standard Delivery"}</p>
                                 </div>
                               </div>
                               <div className="flex items-start gap-3">
                                 <div className="mt-0.5 text-gray-400"><FaUndoAlt size={13} /></div>
                                 <div>
                                   <p className="text-[13px] font-semibold text-gray-800">Return Policy</p>
                                   <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">{view.returnPolicy || "FREE 30-day refund/replacement"}</p>
                                 </div>
                               </div>
                            </div>
                         </div>
                         
                         {/* Category & Bullet Features */}
                         <div className="border border-gray-200 rounded p-3">
                            <h3 className="text-[10px] font-semibold text-gray-400 mb-2.5 uppercase tracking-wider">CATEGORY & HIGHLIGHTS</h3>
                            <div className="mb-4">
                               <p className="text-[11px] text-gray-500 mb-1.5 font-medium">Internal Mapped Category</p>
                               <Select
                                 defaultValue={view.category}
                                 className="w-full h-9"
                                 options={[{ value: view.category, label: view.category }]}
                               />
                            </div>
                            
                            {view.features?.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-3 font-medium">Key Highlights</p>
                                <ul className="space-y-2.5">
                                  {view.features.slice(0, 5).map((feat, i) => (
                                    <li key={i} className="text-[13px] text-gray-700 flex items-start gap-2.5 leading-snug">
                                       <FaCheckCircle className="text-gray-300 mt-0.5 flex-shrink-0" size={12} />
                                       <span className="font-medium text-gray-600">{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                         </div>
                       </div>
                     )
                   },
                   {
                     key: '2',
                     label: 'Specifications',
                     children: (
                       <div className="mt-3 border border-gray-200 rounded p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
                          {Object.entries(view.specs).map(([k, v]) => (
                            <div key={k} className="border-b border-gray-50 pb-3">
                              <p className="text-[11px] font-bold text-gray-400 mb-1 uppercase">{k}</p>
                              <p className="text-[13px] font-semibold text-gray-800">{v}</p>
                            </div>
                          ))}
                          {Object.keys(view.specs).length === 0 && (
                             <p className="text-sm text-gray-500 font-medium py-4">No technical specifications available.</p>
                          )}
                       </div>
                     )
                   },
                   {
                     key: '3',
                     label: 'Description',
                     children: (
                       <div className="mt-3 border border-gray-200 p-4 rounded text-[12px] text-gray-600 whitespace-pre-wrap max-h-[420px] overflow-y-auto thin-scrollbar leading-relaxed">
                         {view.description || "No detailed description available."}
                       </div>
                     )
                   }
                 ]}
              />
           </div>
           
           {/* Right Column: Imagery & Actions */}
           <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-4 relative">
              
              <div className="bg-gray-50 rounded p-3 relative overflow-hidden border border-gray-200 h-56 flex items-center justify-center">
                 {/* Floating Badges */}
                 <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                   {view.isAmazonChoice && (
                     <span className="bg-[#232F3E] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                       Amazon's Choice
                     </span>
                   )}
                   {view.isBestSeller && (
                     <span className="bg-[#F3A847] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                       <FaCrown size={12} className="mb-0.5" /> Best Seller
                     </span>
                   )}
                 </div>
                 
                 {loadingDetails && !details && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 backdrop-blur-sm z-10">
                     <Spin size="small" />
                     <span className="text-[10px] text-gray-400">Fetching from Amazon…</span>
                   </div>
                 )}
                 
                 {mainImage ? (
                   <img
                     src={mainImage}
                     alt={view.title}
                     className="max-w-full max-h-full object-contain"
                   />
                 ) : (
                   <div className="text-gray-300 font-medium">No Image</div>
                 )}
              </div>
              
              {/* Thumbnails */}
              {view.photos.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto thin-scrollbar pb-2">
                  {view.photos.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setActiveImage(src)}
                      className={`flex-shrink-0 rounded overflow-hidden transition-colors bg-white ${
                        mainImage === src
                          ? "border border-gray-900"
                          : "border border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={src} alt="" className="w-12 h-12 object-contain" />
                    </button>
                  ))}
                </div>
              )}
              
              <div className="pt-1 mt-1 flex flex-col gap-2.5">
                  {(() => {
                    const safeAmazonUrl = getSafeAmazonUrl(view.productUrl, product?.asin, product?.country);
                    return safeAmazonUrl ? (
                       <a
                         href={safeAmazonUrl}
                         target="_blank"
                         rel="noreferrer"
                         className="w-full h-9 rounded border border-gray-200 text-gray-700 font-medium text-[12px] flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-black transition-colors"
                       >
                         <FaAmazon className="text-gray-400" size={13} /> View Original on Amazon
                       </a>
                    ) : null;
                  })()}
                 <button
                   onClick={handlePublish}
                   disabled={busy}
                   className="w-full h-10 rounded bg-gray-900 text-white font-semibold text-[13px] hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {busy && <FiRefreshCw className="animate-spin" size={13} />}
                   {drafting ? "Preparing draft…" : publishing ? "Publishing…" : "Publish to Bol.com"}
                 </button>
              </div>
           </div>
        </div>
      </div>
      
      {/* Small custom CSS injection for tabs styling to match the aesthetic */}
      <style dangerouslySetInnerHTML={{__html: `
        .product-modal .ant-modal-content {
           border-radius: 8px;
           padding: 20px 24px;
        }
        .custom-tabs .ant-tabs-nav::before {
           border-bottom: 2px solid #f3f4f6;
        }
        .custom-tabs .ant-tabs-tab {
           padding: 8px 0;
           margin: 0 24px 0 0;
        }
        .custom-tabs .ant-tabs-tab-btn {
           font-weight: 600;
           font-size: 13px;
           color: #9ca3af;
        }
        .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
           color: #111827 !important;
        }
        .custom-tabs .ant-tabs-ink-bar {
           background: #111827;
           height: 2px !important;
           border-radius: 0;
        }
      `}} />
    </Modal>
  );
};

export default ProductDetailsModal;
