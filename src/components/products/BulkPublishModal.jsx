import { useState, useEffect, useRef } from "react";
import { Modal, Select, DatePicker, Button, Spin, InputNumber } from "antd";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
import {
  useGetBolCredentialsQuery,
} from "../../Redux/connectionApis";
import { useUI } from "../../Provider/ContextProvider";
import productApis, { 
  useCreateDraftFromAmazonMutation,
  useGetDraftsByAsinsMutation,
  useBulkTranslateDraftImagesMutation,
  useTranslateDraftImagesMutation,
} from "../../Redux/productApis";
import { useDispatch } from "react-redux";
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
  const dispatch = useDispatch();
  const { setSettingsOpen, setSettingsTab, activeBolAccountId } = useUI();
  const [selectedAccount, setSelectedAccount] = useState(activeBolAccountId || null);

  const { data: bolCreds = [], isLoading: loadingCreds } = useGetBolCredentialsQuery();
  const [generateDraft] = useCreateDraftFromAmazonMutation();
  const [getDraftsByAsins] = useGetDraftsByAsinsMutation();
  const [bulkTranslateDraftImages, { isLoading: isBulkTranslating }] = useBulkTranslateDraftImagesMutation();
  const [translateSingleDraft] = useTranslateDraftImagesMutation();

  const [form, setForm] = useState({
    condition: "NEW",
    delivery_code: "1-8d",
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
    let isCancelled = false;
    const activeRequests = new Set();

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

      // Step 1: High-speed batch lookup of existing drafts for all selected ASINs at once
      const existingDraftsMap = new Map();
      try {
        const asins = validProducts.map(p => p.asin);
        const lookupRes = await getDraftsByAsins({
          asins,
          bolAccountId: selectedAccount
        }).unwrap();

        if (lookupRes?.success && Array.isArray(lookupRes.data)) {
          lookupRes.data.forEach(d => {
            if (d.asin) existingDraftsMap.set(d.asin, d);
          });
        }
      } catch (lookupErr) {
        console.warn("Batch draft lookup failed, will generate via single calls:", lookupErr);
      }

      if (isCancelled) return;

      // Populate any existing drafts directly into local state
      const prePopulatedDrafts = [];
      const productsToGenerate = [];

      validProducts.forEach(p => {
        const existing = existingDraftsMap.get(p.asin);
        if (existing) {
          const photos = existing.photos || (existing.image ? [existing.image] : (p.image ? [p.image] : []));
          const translatedPhotosCount = photos.filter(url => typeof url === 'string' && url.includes("translated-images")).length;
          const isTranslated = Boolean(existing.images_translated || (photos.length > 0 && translatedPhotosCount === photos.length));
          
          prePopulatedDrafts.push({
            id: p.id,
            asin: p.asin,
            ean: existing.ean || p.spreadsheetEan || p.ean || "",
            supplierUrl: p.supplier_link || p.supplierUrl || `https://www.amazon.nl/dp/${p.asin}`,
            image: photos[0] || p.image,
            photos: photos,
            isTranslated: isTranslated,
            translatedPhotosCount: translatedPhotosCount,
            draftId: existing.id || existing._id,
            draftPrice: existing.bol_price || existing.estimated_price || p.price || 39.95,
            draftStock: existing.stock_amount || (typeof p.stock === 'number' ? p.stock : 10),
            draftTitle: existing.title || p.spreadsheetTitle || p.title || p.asin
          });
        } else {
          productsToGenerate.push(p);
        }
      });

      if (prePopulatedDrafts.length > 0) {
        setDrafts(prePopulatedDrafts);
      }
      setGeneratedCount(prePopulatedDrafts.length);

      // If all selected products already have drafts, we're DONE instantly!
      if (productsToGenerate.length === 0) {
        setIsGeneratingDrafts(false);
        return;
      }

      // Step 2: Only generate drafts for products that don't have one yet
      const batchSize = 4;
      let count = prePopulatedDrafts.length;
      for (let i = 0; i < productsToGenerate.length; i += batchSize) {
        if (isCancelled) break;
        const batch = productsToGenerate.slice(i, i + batchSize);
        await Promise.all(batch.map(async (p) => {
          if (isCancelled) return;
          try {
            const payload = {
              asin: p.asin,
              country: p.country || "NL",
              title: p.spreadsheetTitle || p.title || p.asin,
              ean: p.spreadsheetEan || p.ean || "",
              estimated_price: parseFloat(p.price) || 0,
              status: "draft",
              photos: [], // Let Amazon scraper fetch all 5-8 product photos
              bolAccountId: selectedAccount
            };
            const reqPromise = generateDraft(payload);
            activeRequests.add(reqPromise);
            const result = await reqPromise.unwrap();
            activeRequests.delete(reqPromise);
            if (isCancelled) return;
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
            if (!isCancelled) {
              console.error(`Failed to create draft for ASIN ${p.asin}:`, err);
            }
          } finally {
            if (!isCancelled) {
              count += 1;
              setGeneratedCount(count);
            }
          }
        }));
      }
      if (!isCancelled) {
        setIsGeneratingDrafts(false);
      }
    };

    if (products && products.length > 0) {
      createDrafts();
    } else {
      setIsGeneratingDrafts(false);
    }

    return () => {
      isCancelled = true;
      activeRequests.forEach(req => {
        try { req.abort(); } catch (_) {}
      });
      activeRequests.clear();
    };
  }, [products]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const draftsRef = useRef(drafts);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  const cancelTranslationRef = useRef(false);

  // Auto-dismiss translating spinner if all drafts in queue are already translated
  useEffect(() => {
    if (drafts.length > 0 && drafts.every(d => d.isTranslated) && isTranslatingAll) {
      setIsTranslatingAll(false);
    }
  }, [drafts, isTranslatingAll]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelTranslationRef.current = true;
    };
  }, []);

  const totalImagesCount = drafts.reduce((acc, d) => acc + (d.photos?.length || (d.image ? 1 : 0)), 0);
  const translatedImagesCount = drafts.reduce((acc, d) => {
    return acc + (d.translatedPhotosCount ?? (d.isTranslated ? (d.photos?.length || 1) : 0));
  }, 0);

  const handleTranslateAllInBulk = async () => {
    if (drafts.length === 0) {
      toast.error("No drafts to translate");
      return;
    }

    cancelTranslationRef.current = false;
    const initialDrafts = [...drafts];
    const initialTotalImgs = drafts.reduce((acc, d) => acc + (d.photos?.length || (d.image ? 1 : 0)), 0);
    const initialTranslated = drafts.reduce((acc, d) => acc + (d.translatedPhotosCount ?? (d.isTranslated ? (d.photos?.length || 1) : 0)), 0);

    setIsTranslatingAll(true);
    setTranslationProgress({
      current: initialTranslated,
      total: initialTotalImgs,
      currentProductTitle: "Starting Dutch AI image translations...",
      percent: initialTotalImgs > 0 ? Math.round((initialTranslated / initialTotalImgs) * 100) : 0
    });

    try {
      for (let i = 0; i < initialDrafts.length; i++) {
        if (cancelTranslationRef.current) break;

        const d = initialDrafts[i];

        // 1. Check if user deleted this product from the modal while translation was in progress
        const isStillInModal = draftsRef.current.some(item => item.draftId === d.draftId);
        if (!isStillInModal) {
          continue; // User deleted this product; skip immediately!
        }

        // 2. Check if all remaining active drafts in modal are already translated
        const remainingUntranslated = draftsRef.current.filter(item => !item.isTranslated);
        if (remainingUntranslated.length === 0) {
          break; // All active products in modal are 100% translated; finish immediately!
        }

        // 3. Check if this draft is already translated
        const currentDraft = draftsRef.current.find(item => item.draftId === d.draftId);
        if (currentDraft?.isTranslated || d.isTranslated) {
          continue;
        }

        // Update progress with active drafts count
        const activeDrafts = draftsRef.current;
        const curTotal = activeDrafts.reduce((acc, item) => acc + (item.photos?.length || (item.image ? 1 : 0)), 0);
        const curTrans = activeDrafts.reduce((acc, item) => acc + (item.translatedPhotosCount ?? (item.isTranslated ? (item.photos?.length || 1) : 0)), 0);

        setTranslationProgress({
          current: curTrans,
          total: curTotal,
          currentProductTitle: `Translating: ${d.draftTitle || 'Product'}...`,
          percent: curTotal > 0 ? Math.round((curTrans / curTotal) * 100) : 0
        });

        try {
          // Timeout guard (45s) so slow external APIs never hang the frontend loop permanently
          const translatePromise = translateSingleDraft({
            draftId: d.draftId,
            bolAccountId: selectedAccount
          }).unwrap();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Translation request timed out")), 45000)
          );

          const res = await Promise.race([translatePromise, timeoutPromise]);

          if (res?.success && res.data?.photos) {
            const newPhotos = res.data.photos;
            const photoCount = newPhotos.length || (d.photos?.length || 1);

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
          }
        } catch (draftErr) {
          console.error(`Failed translating images for draft ${d.draftId}:`, draftErr);
        }

        // Re-evaluate live progress after this draft
        const updatedActive = draftsRef.current;
        const updatedTotal = updatedActive.reduce((acc, item) => acc + (item.photos?.length || (item.image ? 1 : 0)), 0);
        const updatedTrans = updatedActive.reduce((acc, item) => acc + (item.translatedPhotosCount ?? (item.isTranslated ? (item.photos?.length || 1) : 0)), 0);

        setTranslationProgress({
          current: updatedTrans,
          total: updatedTotal,
          currentProductTitle: `Processed: ${d.draftTitle || 'Product'}`,
          percent: updatedTotal > 0 ? Math.round((updatedTrans / updatedTotal) * 100) : 0
        });
      }

      // Final completion state based on remaining active drafts
      const finalActive = draftsRef.current;
      const finalTotal = finalActive.reduce((acc, item) => acc + (item.photos?.length || (item.image ? 1 : 0)), 0);
      setTranslationProgress({
        current: finalTotal,
        total: finalTotal,
        currentProductTitle: "✓ All product images successfully translated to Dutch!",
        percent: 100
      });
      toast.success("Translation complete!");
    } catch (err) {
      console.error("Bulk translate error:", err);
      toast.error("Failed to complete bulk translation");
    } finally {
      setIsTranslatingAll(false);
    }
  };

  // Auto-start bulk image translation when drafts are loaded and any are untranslated
  const autoBulkTranslateTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isGeneratingDrafts && drafts.length > 0 && !isTranslatingAll && !autoBulkTranslateTriggeredRef.current) {
      const hasUntranslated = drafts.some(d => !d.isTranslated);
      if (hasUntranslated) {
        autoBulkTranslateTriggeredRef.current = true;
        handleTranslateAllInBulk();
      }
    }
  }, [isGeneratingDrafts, drafts, isTranslatingAll]);

  // Validation: Missing or invalid 13-digit EANs
  const invalidEanDrafts = drafts.filter(
    d => !d.ean || d.ean.length !== 13 || !/^\d+$/.test(d.ean)
  );
  const hasInvalidEan = invalidEanDrafts.length > 0;

  // Validation: Missing or insufficient photos (< 3 photos)
  const insufficientPhotosDrafts = drafts.filter(
    d => !d.photos || d.photos.length < 3
  );
  const hasInsufficientPhotos = insufficientPhotosDrafts.length > 0;

  // Validation: Untranslated Images
  const untranslatedDrafts = drafts.filter(d => !d.isTranslated);
  const hasUntranslatedImages = untranslatedDrafts.length > 0;

  const handleRemoveDraft = (draftId) => {
    setDrafts(prev => {
      const updated = prev.filter(d => d.draftId !== draftId);
      if (updated.length > 0 && updated.every(d => d.isTranslated)) {
        setIsTranslatingAll(false);
      }
      return updated;
    });
    toast.success("Removed product from publish list");
  };

  const handleRemoveAllInvalidDrafts = () => {
    const invalidIds = new Set(invalidEanDrafts.map(d => d.draftId));
    setDrafts(prev => {
      const updated = prev.filter(d => !invalidIds.has(d.draftId));
      if (updated.length > 0 && updated.every(d => d.isTranslated)) {
        setIsTranslatingAll(false);
      }
      return updated;
    });
    toast.success(`Removed ${invalidIds.size} invalid product(s) from list`);
  };

  const handleBulkPublish = async () => {
    if (hasInvalidEan) {
      toast.error(`Cannot publish: ${invalidEanDrafts.length} product(s) have missing or invalid 13-digit EANs.`);
      return;
    }

    if (hasInsufficientPhotos) {
      toast.error(`Cannot publish: ${insufficientPhotosDrafts.length} product(s) have fewer than 3 photos. A minimum of 3 photos is required per product.`);
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

      if (scheduleEnabled && form.schedule_at) {
        const amsDate = dayjs(form.schedule_at).tz("Europe/Amsterdam");
        if (amsDate.isBefore(dayjs())) {
          toast.error("Scheduled publish time must be in the future.");
          setIsPublishing(false);
          return;
        }
      }

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
          schedule_at: scheduleEnabled && form.schedule_at ? dayjs(form.schedule_at).tz("Europe/Amsterdam").toISOString() : null
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Bulk publish failed");
      }
      
      toast.success(data.message || "Bulk publish started!");
      dispatch(productApis.util.invalidateTags(["Products", "BolOffers"]));
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
            <p className="mt-4 text-gray-600 font-semibold">
              {generatedCount === 0 ? "Loading existing drafts..." : `Generating Drafts... (${generatedCount}/${products.length})`}
            </p>
            <Button
              className="mt-4 text-gray-500 hover:text-red-600 border-gray-200 hover:border-red-300 text-xs font-medium cursor-pointer"
              onClick={onClose}
            >
              Cancel Operation
            </Button>
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
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-blue-700">{translationProgress.percent}%</span>
                    <button
                      type="button"
                      onClick={() => {
                        cancelTranslationRef.current = true;
                        setIsTranslatingAll(false);
                        toast.success("Translation stopped");
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
                    >
                      Stop
                    </button>
                  </div>
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
                          {(d.photos?.length || 0) < 3 ? (
                            <span 
                              className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200 flex items-center gap-1 cursor-pointer hover:bg-rose-100 transition-colors"
                              onClick={() => setEditingDraftId(d.draftId)}
                              title="At least 3 photos required. Click to upload photos."
                            >
                              <span>⚠️</span>
                              <span>Only {d.photos?.length || 0}/3 Photos</span>
                              <span className="underline ml-0.5 font-semibold">(Upload)</span>
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                              {d.photos.length} Photos
                            </span>
                          )}

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
                  disabledDate={(current) => {
                    const todayAms = dayjs().tz("Europe/Amsterdam").startOf("day");
                    return current && current < todayAms;
                  }}
                  onChange={(d) => {
                    if (!d) {
                      handleChange("schedule_at", null);
                      return;
                    }
                    const dateStr = d.format("YYYY-MM-DD HH:mm:ss");
                    const amsDt = dayjs.tz(dateStr, "Europe/Amsterdam");
                    handleChange("schedule_at", amsDt);
                  }}
                />
                {form.schedule_at && (
                  <div className="text-[11px] text-gray-500 mt-1.5 bg-blue-50/60 border border-blue-100 rounded px-2.5 py-1.5 flex flex-col gap-0.5">
                    <div className="text-blue-900 font-medium flex items-center justify-between">
                      <span>Amsterdam (Bol.com):</span>
                      <span className="font-semibold">{dayjs(form.schedule_at).tz("Europe/Amsterdam").format("DD MMM YYYY, HH:mm")} (CET/CEST)</span>
                    </div>
                    <div className="text-gray-500 flex items-center justify-between text-[10px]">
                      <span>Your Local Time:</span>
                      <span>{dayjs(form.schedule_at).local().format("DD MMM YYYY, HH:mm")}</span>
                    </div>
                  </div>
                )}
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

          {/* Insufficient Photos Alert (< 3 photos) */}
          {hasInsufficientPhotos && !hasInvalidEan && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3 text-rose-900 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">📸</span>
                <div>
                  <span className="font-bold text-rose-900">Minimum 3 Photos Required: </span>
                  <span className="text-rose-700">
                    {insufficientPhotosDrafts.length} product(s) have fewer than 3 photos. Click "Upload" or "Edit" on each product to add photos.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Untranslated Images Alert (clean & non-redundant) */}
          {hasUntranslatedImages && !hasInvalidEan && !hasInsufficientPhotos && (
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
            disabled={isGeneratingDrafts || drafts.length === 0 || hasInvalidEan || hasInsufficientPhotos || hasUntranslatedImages}
            className="bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed h-11 text-sm font-semibold rounded-xl shadow-md cursor-pointer"
            title={
              hasInsufficientPhotos
                ? `A minimum of 3 photos is required for each product (${insufficientPhotosDrafts.length} product(s) need more photos).`
                : hasInvalidEan
                  ? `Some products have missing or invalid 13-digit EANs.`
                  : hasUntranslatedImages
                    ? `Some product images need Dutch translation.`
                    : ""
            }
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
