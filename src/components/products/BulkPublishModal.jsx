import { useState, useEffect } from "react";
import { Modal, Select, DatePicker, Button, Spin, InputNumber } from "antd";
import toast from "react-hot-toast";
import {
  useGetBolCredentialsQuery,
} from "../../Redux/connectionApis";
import { useUI } from "../../Provider/ContextProvider";
import { 
  useCreateDraftFromAmazonMutation,
  useBulkTranslateDraftImagesMutation,
  useTranslateDraftImagesMutation,
} from "../../Redux/productApis";
import { url as API_URL } from "../../Redux/main/server";
import { getToken } from "../../utils/session";
import DraftEditModal from "./DraftEditModal";
import { LuTrash2 } from "react-icons/lu";

const Field = ({ label, children, required }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const BulkPublishModal = ({ products, onClose, onClearSelection }) => {
  const { setSettingsOpen, setSettingsTab, activeBolAccountId } = useUI();
  const [selectedAccount, setSelectedAccount] = useState(activeBolAccountId || null);

  const { data: bolCreds = [], isLoading: loadingCreds } = useGetBolCredentialsQuery();
  const [generateDraft] = useCreateDraftFromAmazonMutation();
  const [bulkTranslateDraftImages, { isLoading: isBulkTranslating }] = useBulkTranslateDraftImagesMutation();
  const [translateSingleDraft] = useTranslateDraftImagesMutation();

  const [form, setForm] = useState({
    condition: "NEW",
    delivery_code: "24uurs-15",
    schedule_at: null,
  });
  
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(true);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [drafts, setDrafts] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);

  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translationProgress, setTranslationProgress] = useState({
    current: 0,
    total: 0,
    currentProductTitle: "",
    percent: 0
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  useEffect(() => {
    if (activeBolAccountId && !selectedAccount) {
      setSelectedAccount(activeBolAccountId);
    }
  }, [activeBolAccountId]);

  useEffect(() => {
    const createDrafts = async () => {
      if (hasGenerated) return;
      setHasGenerated(true);
      setIsGeneratingDrafts(true);
      setGeneratedCount(0);
      
      const validProducts = (products || []).filter(p => p && p.asin);
      if (validProducts.length === 0) {
        setIsGeneratingDrafts(false);
        return;
      }

      // Process in parallel batches of 4 concurrent requests for lightning-fast draft generation
      const batchSize = 4;
      let count = 0;
      for (let i = 0; i < validProducts.length; i += batchSize) {
        const batch = validProducts.slice(i, i + batchSize);
        await Promise.all(batch.map(async (p) => {
          try {
            const payload = {
              asin: p.asin,
              country: p.country || "NL",
              title: p.spreadsheetTitle || p.title || p.asin,
              ean: p.spreadsheetEan || p.ean || "",
              estimated_price: parseFloat(p.price) || 0,
              status: "draft",
              photos: [] // Let Amazon scraper fetch all 5-8 product photos
            };
            const result = await generateDraft(payload).unwrap();
            if (result.success && result.data?.id) {
              const photos = result.data.photos || (p.image ? [p.image] : []);
              const translatedPhotosCount = photos.filter(url => typeof url === 'string' && url.includes("translated-images")).length;
              const isTranslated = photos.length > 0 && translatedPhotosCount === photos.length;
              const draftItem = {
                id: p.id,
                asin: p.asin,
                ean: p.spreadsheetEan || p.ean || result.data.ean || "",
                supplierUrl: p.supplier_link || p.supplierUrl || `https://www.amazon.nl/dp/${p.asin}`,
                image: photos[0] || p.image,
                photos: photos,
                isTranslated: isTranslated,
                translatedPhotosCount: translatedPhotosCount,
                draftId: result.data.id,
                draftPrice: result.data.bol_price || result.data.estimated_price || p.price || 39.95,
                draftStock: result.data.stock_amount || (typeof p.stock === 'number' ? p.stock : 10),
                draftTitle: result.data.title || payload.title
              };
              setDrafts((prev) => {
                const filtered = prev.filter(d => d.asin !== draftItem.asin);
                return [...filtered, draftItem];
              });
            }
          } catch (err) {
            console.error(`Failed to create draft for ASIN ${p.asin}:`, err);
          } finally {
            count += 1;
            setGeneratedCount(count);
          }
        }));
      }
      setIsGeneratingDrafts(false);
    };

    if (products && products.length > 0) {
      createDrafts();
    } else {
      setIsGeneratingDrafts(false);
    }
  }, [products]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const totalImagesCount = drafts.reduce((acc, d) => acc + (d.photos?.length || (d.image ? 1 : 0)), 0);
  const translatedImagesCount = drafts.reduce((acc, d) => {
    return acc + (d.translatedPhotosCount ?? (d.isTranslated ? (d.photos?.length || 1) : 0));
  }, 0);

  const handleTranslateAllInBulk = async () => {
    if (drafts.length === 0) {
      toast.error("No drafts to translate");
      return;
    }

    const totalImgs = totalImagesCount;
    let liveTranslated = translatedImagesCount;

    setIsTranslatingAll(true);
    setTranslationProgress({
      current: liveTranslated,
      total: totalImgs,
      currentProductTitle: "Starting Dutch AI image translations...",
      percent: totalImgs > 0 ? Math.round((liveTranslated / totalImgs) * 100) : 0
    });

    try {
      // Translate each draft with untranslated photos sequentially with real-time UI updates
      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        if (d.isTranslated) {
          continue; // Already fully translated
        }

        const draftPhotoCount = d.photos?.length || (d.image ? 1 : 0);

        setTranslationProgress(prev => ({
          ...prev,
          currentProductTitle: `Translating (${i + 1}/${drafts.length}): ${d.draftTitle || 'Product'}...`,
        }));

        try {
          const res = await translateSingleDraft({
            draftId: d.draftId,
            bolAccountId: selectedAccount
          }).unwrap();

          if (res.success && res.data?.photos) {
            const newPhotos = res.data.photos;
            const photoCount = newPhotos.length || draftPhotoCount;

            liveTranslated += draftPhotoCount;
            if (liveTranslated > totalImgs) liveTranslated = totalImgs;

            // Immediately update the specific draft in local state so UI flips live in real time
            setDrafts(prev => prev.map(item => {
              if (item.draftId === d.draftId) {
                return {
                  ...item,
                  photos: newPhotos,
                  image: newPhotos[0] || item.image,
                  isTranslated: true,
                  translatedPhotosCount: photoCount
                };
              }
              return item;
            }));

            setTranslationProgress({
              current: liveTranslated,
              total: totalImgs,
              currentProductTitle: `✓ Translated: ${d.draftTitle || 'Product'} (${photoCount} photos ready)`,
              percent: totalImgs > 0 ? Math.round((liveTranslated / totalImgs) * 100) : 0
            });
          }
        } catch (draftErr) {
          console.error(`Failed translating images for draft ${d.draftId}:`, draftErr);
          liveTranslated += draftPhotoCount;
          setTranslationProgress({
            current: Math.min(liveTranslated, totalImgs),
            total: totalImgs,
            currentProductTitle: `Processed: ${d.draftTitle || 'Product'}`,
            percent: totalImgs > 0 ? Math.round((Math.min(liveTranslated, totalImgs) / totalImgs) * 100) : 0
          });
        }
      }

      setTranslationProgress({
        current: totalImgs,
        total: totalImgs,
        currentProductTitle: "✓ All product images successfully translated to Dutch!",
        percent: 100
      });
      toast.success(`Translation complete! (${totalImgs}/${totalImgs} images translated)`);
    } catch (err) {
      console.error("Bulk translate error:", err);
      toast.error("Failed to complete bulk translation");
    } finally {
      setIsTranslatingAll(false);
    }
  };

  // Validation: Missing or invalid 13-digit EANs
  const invalidEanDrafts = drafts.filter(
    d => !d.ean || d.ean.length !== 13 || !/^\d+$/.test(d.ean)
  );
  const hasInvalidEan = invalidEanDrafts.length > 0;

  // Validation: Untranslated Images
  const untranslatedDrafts = drafts.filter(d => !d.isTranslated);
  const hasUntranslatedImages = untranslatedDrafts.length > 0;

  const handleRemoveDraft = (draftId) => {
    setDrafts(prev => prev.filter(d => d.draftId !== draftId));
    toast.success("Removed product from publish list");
  };

  const handleRemoveAllInvalidDrafts = () => {
    const invalidIds = new Set(invalidEanDrafts.map(d => d.draftId));
    setDrafts(prev => prev.filter(d => !invalidIds.has(d.draftId)));
    toast.success(`Removed ${invalidIds.size} invalid product(s) from list`);
  };

  const handleBulkPublish = async () => {
    if (hasInvalidEan) {
      toast.error(`Cannot publish: ${invalidEanDrafts.length} product(s) have missing or invalid 13-digit EANs.`);
      return;
    }

    if (hasUntranslatedImages) {
      toast.error(`Cannot publish: ${untranslatedDrafts.length} product(s) have untranslated images. Please translate all images first.`);
      return;
    }

    const activeCred = bolCreds.find(c => c.account_id === selectedAccount);
    const hasCreds = activeCred?.client_id && activeCred?.is_secret_set;
    if (!hasCreds) {
      toast.error("You must connect your Bol.com credentials first!");
      onClose();
      setSettingsTab("connection");
      setSettingsOpen(true);
      return;
    }

    if (!selectedAccount) {
      toast.error("Please select a Bol.com account");
      return;
    }

    setIsPublishing(true);
    try {
      const draftIds = drafts.map(d => d.draftId);
      if (draftIds.length === 0) {
        toast.error("No valid products to publish.");
        setIsPublishing(false);
        return;
      }

      // Build stock overrides mapping for all products in queue
      const stock_overrides = {};
      drafts.forEach(d => {
        stock_overrides[d.draftId] = typeof d.draftStock === 'number' ? d.draftStock : 10;
      });

      const token = localStorage.getItem("bol_access_token") || localStorage.getItem("bol_access_token_v2") || getToken() || "";
      const res = await fetch(`${API_URL}/bol/drafts/bulk-publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          draft_ids: draftIds,
          account_id: selectedAccount,
          condition: form.condition,
          delivery_code: form.delivery_code,
          stock_overrides: stock_overrides,
          schedule_at: scheduleEnabled && form.schedule_at ? form.schedule_at.toISOString() : null
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Bulk publish failed");
      }
      
      toast.success(data.message || "Bulk publish started!");
      onClearSelection();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      <Modal
        title={
          <div className="flex items-center justify-between pr-6">
            <h2 className="text-xl font-bold tracking-tight text-gray-800">
              {products.length === 1 ? "Publish Product" : `Bulk Publish Products (${drafts.length})`}
            </h2>
            {drafts.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                {drafts.length} item{drafts.length > 1 ? 's' : ''} in queue
              </span>
            )}
          </div>
        }
        open={true}
        onCancel={onClose}
        footer={null}
        width={880}
        destroyOnHidden={true}
        style={{ display: editingDraftId ? 'none' : 'block' }}
      >
        {isGeneratingDrafts ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600 font-semibold">Generating Drafts... ({generatedCount}/{products.length})</p>
          </div>
        ) : (
        <div className="flex flex-col gap-5 py-4">
          {loadingCreds ? (
            <div className="flex justify-center p-4"><Spin /></div>
          ) : (
            <Field label="Bol.com Account" required>
              <Select
                className="w-full h-10"
                value={selectedAccount}
                onChange={(v) => setSelectedAccount(v)}
                options={bolCreds.map(c => ({
                  label: c.account_name || c.account_id,
                  value: c.account_id,
                }))}
                placeholder="Select account"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Condition" required>
              <Select
                className="w-full h-10"
                value={form.condition}
                onChange={(v) => handleChange("condition", v)}
                options={[
                  { label: "New", value: "NEW" },
                  { label: "As New", value: "AS_NEW" },
                  { label: "Good", value: "GOOD" },
                  { label: "Reasonable", value: "REASONABLE" },
                  { label: "Moderate", value: "MODERATE" },
                ]}
              />
            </Field>

            <Field label="Delivery Time" required>
              <Select
                className="w-full h-10"
                value={form.delivery_code}
                onChange={(v) => handleChange("delivery_code", v)}
                options={[
                  { label: "24h - Order before 15:00", value: "24uurs-15" },
                  { label: "24h - Order before 23:00", value: "24uurs-23" },
                  { label: "1-2 days", value: "1-2d" },
                  { label: "2-3 days", value: "2-3d" },
                  { label: "3-5 days", value: "3-5d" },
                  { label: "4-8 days", value: "4-8d" },
                  { label: "1-8 days", value: "1-8d" },
                ]}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            {/* Header with single clean status pill & action button */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Drafts Ready to Publish ({drafts.length})
                </label>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                  !hasUntranslatedImages && totalImagesCount > 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  {!hasUntranslatedImages && totalImagesCount > 0
                    ? `✓ All ${totalImagesCount} Images Ready`
                    : `📸 ${translatedImagesCount}/${totalImagesCount} Images Translated`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTranslateAllInBulk}
                disabled={isTranslatingAll || isGeneratingDrafts || drafts.length === 0 || !hasUntranslatedImages}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
                  !hasUntranslatedImages && totalImagesCount > 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                    : "bg-brand/10 text-brand hover:bg-brand hover:text-white border border-brand/20 cursor-pointer disabled:opacity-50"
                }`}
                title="Translate all Dutch text in product pictures for all selected drafts using AI"
              >
                {isTranslatingAll ? (
                  <>
                    <Spin size="small" />
                    <span>Translating: {translationProgress.current}/{translationProgress.total}...</span>
                  </>
                ) : !hasUntranslatedImages && totalImagesCount > 0 ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-600">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span>All Images Translated ✓</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                    </svg>
                    <span>Translate All Images</span>
                  </>
                )}
              </button>
            </div>

            {/* Real-time Translation Progress Bar */}
            {isTranslatingAll && (
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-1.5">
                  <span className="flex items-center gap-2">
                    <Spin size="small" />
                    Translating Dutch Product Images ({translationProgress.current} / {translationProgress.total})
                  </span>
                  <span className="font-bold text-blue-700">{translationProgress.percent}%</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-brand h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${translationProgress.percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-blue-700 mt-1.5 truncate mb-0 font-medium">
                  {translationProgress.currentProductTitle}
                </p>
              </div>
            )}

            {/* Drafts List with clean structured alignment */}
            <div className="flex flex-col divide-y divide-gray-100 max-h-[380px] overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-inner">
              {drafts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm font-medium">No valid products in publish queue.</div>
              ) : (
                drafts.map(d => (
                  <div key={d.draftId} className="p-3 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-4">
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        {d.image ? (
                          <img src={d.image} alt="" className="w-12 h-12 object-contain rounded-lg bg-white border border-gray-200 p-0.5 shadow-xs" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">No Img</div>
                        )}
                        {d.isTranslated && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs" title="Images translated to Dutch">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <div className="text-sm font-semibold text-gray-800 truncate mb-1" title={d.draftTitle}>
                          {d.draftTitle}
                        </div>

                        {/* Badges Row */}
                        <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
                          {/* Photos count */}
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                            {d.photos?.length || 1} {d.photos?.length === 1 ? 'Photo' : 'Photos'}
                          </span>

                          {/* Translation Status Badge */}
                          {d.isTranslated ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-600">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                              Translated ({d.photos?.length || 1}/{d.photos?.length || 1})
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              {d.translatedPhotosCount > 0 
                                ? `Partially Translated (${d.translatedPhotosCount}/${d.photos?.length || 1})`
                                : `Untranslated (0/${d.photos?.length || 1})`
                              }
                            </span>
                          )}

                          {/* ASIN */}
                          <span className="flex items-center gap-1 bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                            ASIN: {d.asin}
                            <button 
                              onClick={() => { navigator.clipboard.writeText(d.asin); toast.success("ASIN Copied") }}
                              className="text-gray-400 hover:text-gray-700 cursor-pointer"
                              title="Copy ASIN"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" /><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" /></svg>
                            </button>
                            <a 
                              href={d.supplierUrl}
                              target="_blank" 
                              rel="noreferrer"
                              className="text-brand hover:text-brand-dark cursor-pointer"
                              title="View on Amazon"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" /><path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" /></svg>
                            </a>
                          </span>

                          {/* EAN */}
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${d.ean && d.ean.length === 13 && /^\d+$/.test(d.ean) ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'}`}>
                            {d.ean && d.ean.length === 13 && /^\d+$/.test(d.ean) ? (
                              <>
                                EAN: {d.ean}
                                <button 
                                  onClick={() => { navigator.clipboard.writeText(d.ean); toast.success("EAN Copied") }}
                                  className="text-gray-400 hover:text-gray-700 cursor-pointer"
                                  title="Copy EAN"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" /><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" /></svg>
                                </button>
                              </>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-600 font-bold">
                                <span>⚠️ {d.ean ? `Invalid EAN` : 'Missing EAN'}</span>
                                <span className="underline cursor-pointer" onClick={() => setEditingDraftId(d.draftId)}>(Edit)</span>
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Stock + Price + Actions */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Stock Editor */}
                      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg" title="Edit stock for this product">
                        <span className="text-[10px] font-semibold text-gray-500">Stock:</span>
                        <InputNumber
                          min={0}
                          max={9999}
                          size="small"
                          value={d.draftStock ?? 10}
                          onChange={(val) => {
                            setDrafts(prev => prev.map(item => item.draftId === d.draftId ? { ...item, draftStock: val } : item));
                          }}
                          className="w-14 text-xs font-bold text-gray-800 border-none bg-transparent p-0"
                        />
                      </div>

                      {/* Price */}
                      <div className="text-right min-w-[55px]">
                        <span className="text-gray-900 font-bold text-sm">€{d.draftPrice}</span>
                      </div>

                      {/* Edit Button */}
                      <Button size="small" onClick={() => setEditingDraftId(d.draftId)} className="text-brand border-brand/30 hover:border-brand font-medium h-7 px-2.5 text-xs rounded-lg cursor-pointer">
                        Edit
                      </Button>

                      {/* Delete button */}
                      <button 
                        type="button"
                        onClick={() => handleRemoveDraft(d.draftId)} 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 transition-colors cursor-pointer"
                        title="Remove product from publish list"
                      >
                        <LuTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[13px] font-semibold text-gray-700">Schedule Publishing</label>
              <Button 
                type={scheduleEnabled ? "primary" : "default"} 
                size="small" 
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
              >
                {scheduleEnabled ? "Enabled" : "Off"}
              </Button>
            </div>
            {scheduleEnabled && (
              <Field label="Publish Date & Time (Europe/Amsterdam)">
                <DatePicker 
                  showTime 
                  className="w-full h-10" 
                  format="YYYY-MM-DD HH:mm:ss"
                  onChange={(d) => handleChange("schedule_at", d)} 
                />
              </Field>
            )}
          </div>

          {/* Invalid EAN Alert */}
          {hasInvalidEan && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3 text-rose-800 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <div>
                  <span className="font-bold text-rose-900">Missing EAN Barcodes: </span>
                  <span className="text-rose-700">{invalidEanDrafts.length} product(s) require a 13-digit EAN to publish.</span>
                </div>
              </div>
              <Button
                danger
                size="small"
                onClick={handleRemoveAllInvalidDrafts}
                className="bg-white text-xs font-semibold h-7 rounded-lg shadow-sm"
              >
                Remove Invalid ({invalidEanDrafts.length})
              </Button>
            </div>
          )}

          {/* Untranslated Images Alert (clean & non-redundant) */}
          {hasUntranslatedImages && !hasInvalidEan && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-amber-900 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">ℹ️</span>
                <div>
                  <span className="font-bold text-amber-900">Dutch Translation Required: </span>
                  <span className="text-amber-700">{untranslatedDrafts.length} product(s) have images that must be translated before publishing.</span>
                </div>
              </div>
              <Button
                type="primary"
                size="small"
                onClick={handleTranslateAllInBulk}
                loading={isTranslatingAll}
                className="bg-brand hover:bg-brand-dark text-white font-semibold text-xs h-7 rounded-lg shadow-sm cursor-pointer"
              >
                Translate Now
              </Button>
            </div>
          )}

          <Button
            type="primary"
            size="large"
            onClick={handleBulkPublish}
            loading={isPublishing}
            disabled={isGeneratingDrafts || drafts.length === 0 || hasInvalidEan || hasUntranslatedImages}
            className="bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed h-11 text-sm font-semibold rounded-xl shadow-md cursor-pointer"
          >
            {scheduleEnabled ? "Schedule Bulk Publish" : `Publish All (${drafts.length})`}
          </Button>
        </div>
        )}
      </Modal>

      <DraftEditModal
        open={Boolean(editingDraftId)}
        draftId={editingDraftId}
        onClose={(updatedDraft) => {
          setEditingDraftId(null);
          if (updatedDraft && updatedDraft.id) {
            setDrafts(prev => prev.map(d => {
              if (d.draftId === updatedDraft.id) {
                const photos = updatedDraft.photos || d.photos || [];
                const isTranslated = photos.some(url => typeof url === 'string' && url.includes("translated-images"));
                return {
                  ...d,
                  ean: updatedDraft.ean ?? d.ean,
                  draftTitle: updatedDraft.title || d.draftTitle,
                  draftPrice: updatedDraft.bol_price || updatedDraft.price || d.draftPrice,
                  draftStock: updatedDraft.stock_amount ?? d.draftStock ?? 10,
                  photos: photos,
                  image: photos[0] || d.image,
                  isTranslated: isTranslated,
                  translatedPhotosCount: photos.filter(url => typeof url === 'string' && url.includes("translated-images")).length,
                };
              }
              return d;
            }));
          }
        }}
        isBulkMode={true}
      />
    </>
  );
};

export default BulkPublishModal;
