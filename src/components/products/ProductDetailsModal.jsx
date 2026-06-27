import { useState, useEffect, useMemo } from "react";
import { Modal, Input, Select, Spin, Tabs } from "antd";
import toast from "react-hot-toast";
import { FaStar, FaCheckCircle, FaAmazon, FaTruck, FaUndoAlt, FaCrown } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import {
  useCreateDraftFromAmazonMutation,
  usePublishDraftMutation,
  useScrapeAsinQuery,
  useSyncAsinMutation,
  useUpdateDraftMutation,
} from "../../Redux/productApis";

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

const ProductDetailsModal = ({ open, onClose, product, onDraftCreated }) => {
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

    return {
      amazonTitle,
      sheetTitle,
      title: finalTitle,
      brand: details?.brand || product?.brand || "",
      description: details?.description || product?.description || "",
      amazonPrice: formatPrice(amazonNum),
      price: amazonNum == null ? "" : formatPrice(amazonNum * 2.5),
      originalPrice: details?.originalPrice || "",
      rating: details?.rating || product?.rating || "",
      reviews: details?.reviews || product?.reviews || 0,
      productUrl: details?.productUrl || product?.productUrl || "",
      category: product?.category || "",
      mainImage: details?.mainImage || product?.image || "",
      photos,
      delivery: details?.delivery || "",
      isPrime: details?.isPrime || false,
      isAmazonChoice: details?.isAmazonChoice || false,
      isBestSeller: details?.isBestSeller || false,
      specs: details?.specs || {},
      features: details?.features || [],
      returnPolicy: details?.returnPolicy || "",
    };
  }, [details, product, useSheetTitle]);

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
        delivery_code: "24uurs-23",
      }).unwrap();
      const draftId = draftRes?.data?.id;
      if (!draftId) throw new Error("Draft was not created");
      
      // If using the sheet title, immediately update the draft with it
      if (useSheetTitle) {
        await updateDraft({ id: draftId, title: view.title }).unwrap();
      }
      
      toast.success("Draft created successfully");
      onClose();
      if (onDraftCreated) onDraftCreated(draftId);
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
        <div className="flex items-start justify-between border-b border-gray-100 pb-5 mb-6">
          <div className="pr-4 w-full">
            <div className="flex items-center gap-3 mb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
               <span className="bg-gray-100 px-2 py-0.5 rounded">{view.brand || "Brand"}</span>
               <span className="text-gray-300">•</span>
               <span className="text-gray-400">ASIN: {product?.asin}</span>
            </div>
            <div className="flex items-start justify-between gap-4 pr-2">
              <h2 className="text-lg font-semibold text-gray-800 leading-snug mb-3">
                {view.title || "Product Details"}
              </h2>
              {view.amazonTitle && view.sheetTitle && view.amazonTitle !== view.sheetTitle && (
                <button
                  onClick={() => setUseSheetTitle(!useSheetTitle)}
                  className="flex items-center gap-1.5 flex-shrink-0 text-[10px] font-bold text-gray-500 bg-white border border-gray-200 hover:border-brand hover:text-brand shadow-sm px-2.5 py-1 rounded-full transition-all mt-0.5"
                  title="Swap Title Source"
                >
                  <FiRefreshCw size={11} />
                  {useSheetTitle ? "Sheet Title" : "Amazon Title"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-5 text-sm">
               <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-md font-bold text-xs">
                  <FaStar className="text-yellow-500 mb-[1px]" size={13} />
                  <span>{view.rating || "—"}</span>
               </div>
               <span className="text-gray-500 font-medium text-xs bg-gray-50 px-2.5 py-1 rounded-md">
                 {view.reviews} Reviews
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
                  className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 font-bold bg-blue-50 px-3 py-1 rounded-md text-xs ml-auto"
                >
                  <FiRefreshCw className={isSyncing ? "animate-spin" : ""} size={14} />
                  {isSyncing ? "Syncing..." : "Sync Latest Data"}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
           
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
                         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-6 justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            <div className="relative z-10 w-full sm:w-auto">
                              <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Amazon Price</p>
                              <div className="flex items-end gap-2.5">
                                 <span className="text-2xl font-bold text-gray-800">
                                   {view.amazonPrice ? `€${view.amazonPrice}` : "—"}
                                 </span>
                                 {view.originalPrice && (
                                   <span className="text-sm font-medium text-gray-400 line-through mb-1.5">{view.originalPrice}</span>
                                 )}
                              </div>
                            </div>
                            <div className="w-px h-10 bg-gray-200 hidden sm:block relative z-10"></div>
                            <div className="flex-1 w-full sm:w-auto relative z-10">
                              <p className="text-[11px] font-semibold text-brand mb-1.5 uppercase tracking-wide">Your Selling Price (€)</p>
                              <Input
                                value={yourPrice ? `€${yourPrice}` : ""}
                                onChange={(e) => setYourPrice(e.target.value.replace(/^€/, ""))}
                                className="h-10 rounded-lg text-base font-bold text-brand bg-white border-brand/20 hover:border-brand/50 focus:border-brand shadow-sm px-4"
                              />
                            </div>
                         </div>
                         
                         {/* Delivery & Logistics */}
                         <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                            <h3 className="text-[11px] font-semibold text-gray-400 mb-3 uppercase tracking-wide">Logistics & Returns</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className="flex items-start gap-3">
                                 <div className="mt-0.5 text-blue-500 bg-blue-50 p-1.5 rounded-lg"><FaTruck size={14} /></div>
                                 <div>
                                   <p className="text-[13px] font-semibold text-gray-800">Delivery Details</p>
                                   <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">{view.delivery || "Standard Delivery"}</p>
                                 </div>
                               </div>
                               <div className="flex items-start gap-3">
                                 <div className="mt-0.5 text-green-500 bg-green-50 p-1.5 rounded-lg"><FaUndoAlt size={14} /></div>
                                 <div>
                                   <p className="text-[13px] font-semibold text-gray-800">Return Policy</p>
                                   <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">{view.returnPolicy || "Standard Return Policy"}</p>
                                 </div>
                               </div>
                            </div>
                         </div>
                         
                         {/* Category & Bullet Features */}
                         <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                            <h3 className="text-[11px] font-semibold text-gray-400 mb-3 uppercase tracking-wide">Category & Highlights</h3>
                            <div className="mb-4">
                               <p className="text-[11px] text-gray-500 mb-1.5 font-medium">Internal Mapped Category</p>
                               <Select
                                 defaultValue={view.category}
                                 className="w-full h-10"
                                 options={[{ value: view.category, label: view.category }]}
                               />
                            </div>
                            
                            {view.features?.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-3 font-medium">Key Highlights</p>
                                <ul className="space-y-2.5">
                                  {view.features.slice(0, 5).map((feat, i) => (
                                    <li key={i} className="text-[13px] text-gray-700 flex items-start gap-2.5 leading-snug">
                                       <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
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
                       <div className="mt-4 bg-white border border-gray-100 rounded-xl p-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
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
                       <div className="mt-4 bg-[#f8f9fa] border border-gray-100 p-5 rounded-xl text-[12px] text-gray-700 font-medium whitespace-pre-wrap max-h-[450px] overflow-y-auto thin-scrollbar leading-relaxed">
                         {view.description || "No detailed description available."}
                       </div>
                     )
                   }
                 ]}
              />
           </div>
           
           {/* Right Column: Imagery & Actions */}
           <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-4 relative">
              
              <div className="bg-white rounded-2xl p-4 relative overflow-hidden border border-gray-100 shadow-[0_2px_15px_rgb(0,0,0,0.03)] h-64 flex items-center justify-center">
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
                   <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                     <Spin size="large" />
                   </div>
                 )}
                 
                 {mainImage ? (
                   <img
                     src={mainImage}
                     alt={view.title}
                     className="max-w-full max-h-full object-contain rounded-xl cursor-zoom-in transition-transform duration-500 ease-out hover:scale-110"
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
                      className={`flex-shrink-0 rounded-xl overflow-hidden transition-all bg-white ${
                        mainImage === src
                          ? "border-2 border-brand shadow-md scale-105"
                          : "border border-gray-200 hover:border-gray-300 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={src} alt="" className="w-14 h-14 object-cover" />
                    </button>
                  ))}
                </div>
              )}
              
              <div className="pt-1 mt-1 flex flex-col gap-2.5">
                 {view.productUrl && (
                    <a
                      href={view.productUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-10 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-[12px] flex items-center justify-center gap-2 hover:bg-gray-100 hover:text-black transition-colors"
                    >
                      <FaAmazon className="text-[#FF9900]" size={14} /> View Original on Amazon
                    </a>
                 )}
                 <button
                   onClick={handlePublish}
                   disabled={busy}
                   className="w-full h-11 rounded-lg bg-brand text-white font-semibold text-[13px] shadow-[0_4px_12px_rgba(79,70,229,0.2)] hover:shadow-[0_6px_16px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                 >
                   {busy ? "Publishing to Bol.com..." : "Publish to Bol.com"}
                 </button>
              </div>
           </div>
        </div>
      </div>
      
      {/* Small custom CSS injection for tabs styling to match the aesthetic */}
      <style dangerouslySetInnerHTML={{__html: `
        .product-modal .ant-modal-content {
           border-radius: 24px;
           padding: 24px 32px;
        }
        .custom-tabs .ant-tabs-nav::before {
           border-bottom: 2px solid #f3f4f6;
        }
        .custom-tabs .ant-tabs-tab {
           padding: 12px 0;
           margin: 0 32px 0 0;
        }
        .custom-tabs .ant-tabs-tab-btn {
           font-weight: 600;
           font-size: 13px;
           color: #9ca3af;
        }
        .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
           color: #4f46e5 !important;
        }
        .custom-tabs .ant-tabs-ink-bar {
           background: #4f46e5;
           height: 3px !important;
           border-radius: 3px 3px 0 0;
        }
      `}} />
    </Modal>
  );
};

export default ProductDetailsModal;
