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
              const isTranslated = photos.some(url => typeof url === 'string' && url.includes("translated-images"));
              const draftItem = {
                id: p.id,
                asin: p.asin,
                ean: p.spreadsheetEan || p.ean || result.data.ean || "",
                supplierUrl: p.supplier_link || p.supplierUrl || `https://www.amazon.nl/dp/${p.asin}`,
                image: photos[0] || p.image,
                photos: photos,
                isTranslated: isTranslated,
                translatedPhotosCount: photos.filter(url => typeof url === 'string' && url.includes("translated-images")).length,
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

  const handleTranslateAllInBulk = async () => {
    const draftIds = drafts.map(d => d.draftId).filter(Boolean);
    if (draftIds.length === 0) {
      toast.error("No drafts to translate");
      return;
    }

    try {
      const res = await bulkTranslateDraftImages({ 
        draftIds, 
        draft_ids: draftIds, 
        bolAccountId: selectedAccount 
      }).unwrap();
      
      toast.success(res.message || "All draft images translated successfully!");
      
      // Update local state with any returned translated photos
      const resultsMap = new Map();
      if (Array.isArray(res?.results)) {
        res.results.forEach(r => {
          if (r.draft_id && r.data?.photos) {
            resultsMap.set(r.draft_id, r.data.photos);
          }
        });
      }

      setDrafts(prev => prev.map(d => {
        const newPhotos = resultsMap.get(d.draftId) || d.photos || [];
        const isTranslated = newPhotos.some(url => typeof url === 'string' && url.includes("translated-images"));
        return {
          ...d,
          photos: newPhotos.length > 0 ? newPhotos : d.photos,
          image: newPhotos[0] || d.image,
          isTranslated: isTranslated || true,
          translatedPhotosCount: newPhotos.filter(url => typeof url === 'string' && url.includes("translated-images")).length || d.photos?.length || 1
        };
      }));
    } catch (err) {
      console.error("Bulk translate error:", err);
      let errorMsg = "Failed to bulk translate images";
      if (typeof err?.data?.detail === "string") {
        errorMsg = err.data.detail;
      } else if (Array.isArray(err?.data?.detail)) {
        errorMsg = err.data.detail.map(e => e.msg || JSON.stringify(e)).join(", ");
      } else if (err?.message) {
        errorMsg = err.message;
      }
      toast.error(errorMsg);
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Drafts Ready to Publish ({drafts.length})
              </label>
              <button
                type="button"
                onClick={handleTranslateAllInBulk}
                disabled={isBulkTranslating || isGeneratingDrafts || drafts.length === 0}
                className="px-3 py-1.5 bg-brand/10 text-brand hover:bg-brand hover:text-white border border-brand/20 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                title="Translate all Dutch text in product pictures for all selected drafts using AI"
              >
                {isBulkTranslating ? (
                  <>
                    <Spin size="small" />
                    <span>Translating All Images...</span>
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
            <div className="flex flex-col gap-0 max-h-[380px] overflow-y-auto pr-1 border border-gray-200 rounded-xl bg-white shadow-inner">
              {drafts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm font-medium">No valid products in publish queue.</div>
              ) : (
                drafts.map(d => (
                  <div key={d.draftId} className="flex items-center justify-between gap-4 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/80 transition-colors">
                    <div className="flex items-center gap-3.5 overflow-hidden flex-1">
                      <div className="relative shrink-0">
                        {d.image ? (
                          <img src={d.image || "https://via.placeholder.com/40"} alt="" className="w-12 h-12 object-contain rounded-lg bg-white border border-gray-100 p-0.5 shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs text-gray-400">No Img</div>
                        )}
                        {d.isTranslated && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm" title="Images translated to Dutch">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800 truncate" title={d.draftTitle}>
                            {d.draftTitle}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-500 font-medium">
                          {/* Photos count badge */}
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                            {d.photos?.length || 1} {d.photos?.length === 1 ? 'Photo' : 'Photos'}
                          </span>

                          {/* Translation Status Badge */}
                          {d.isTranslated ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-600">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                              Translated ({d.translatedPhotosCount || d.photos?.length || 1})
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Untranslated
                            </span>
                          )}

                          {/* ASIN Block */}
                          <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            ASIN: {d.asin}
                            <button 
                              onClick={() => { navigator.clipboard.writeText(d.asin); toast.success("ASIN Copied") }}
                              className="text-gray-400 hover:text-gray-700 ml-0.5"
                              title="Copy ASIN"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" /><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" /></svg>
                            </button>
                            <a 
                              href={d.supplierUrl}
                              target="_blank" 
                              rel="noreferrer"
                              className="text-brand hover:text-brand-dark ml-0.5"
                              title="View on Amazon"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" /><path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" /></svg>
                            </a>
                          </span>
                          
                          {/* EAN Block */}
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${d.ean && d.ean.length === 13 && /^\d+$/.test(d.ean) ? 'bg-gray-50 border-gray-100 text-gray-600' : 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'}`}>
                            {d.ean && d.ean.length === 13 && /^\d+$/.test(d.ean) ? (
                              <>
                                EAN: {d.ean}
                                <button 
                                  onClick={() => { navigator.clipboard.writeText(d.ean); toast.success("EAN Copied") }}
                                  className="text-gray-400 hover:text-gray-700 ml-0.5"
                                  title="Copy EAN"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" /><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" /></svg>
                                </button>
                              </>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-600 font-bold">
                                <span>⚠️ {d.ean ? `Invalid EAN: ${d.ean}` : 'Missing EAN'}</span>
                                <span className="text-[10px] text-rose-500 font-normal underline cursor-pointer" onClick={() => setEditingDraftId(d.draftId)}>(Click Edit)</span>
                              </span>
                            )}
                          </span>

                          {/* Editable Stock Input */}
                          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg shadow-xs" title="Edit stock for this product">
                            <span className="text-[11px] font-semibold text-gray-500">Stock:</span>
                            <InputNumber
                              min={0}
                              max={9999}
                              size="small"
                              value={d.draftStock ?? 10}
                              onChange={(val) => {
                                setDrafts(prev => prev.map(item => item.draftId === d.draftId ? { ...item, draftStock: val } : item));
                              }}
                              className="w-16 h-6 text-xs font-bold text-gray-800 border-none bg-transparent"
                            />
                          </div>

                          {/* Price Block */}
                          <span className="ml-1 text-gray-800 font-bold text-xs">€{d.draftPrice}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="small" onClick={() => setEditingDraftId(d.draftId)} className="text-brand border-brand font-medium h-8">
                        Edit
                      </Button>
                      <button 
                        type="button"
                        onClick={() => handleRemoveDraft(d.draftId)} 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 transition-colors"
                        title="Remove product from publish list"
                      >
                        <LuTrash2 size={14} />
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
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800 text-xs shadow-sm">
              <div className="flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-rose-600 shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-bold text-rose-900">Publishing Blocked: {invalidEanDrafts.length} product(s) missing valid 13-digit EANs.</div>
                  <p className="mt-0.5 text-rose-700 leading-relaxed">
                    Bol.com requires an official 13-digit barcode. Click <strong>Edit</strong> to enter EANs, or remove them to publish valid products.
                  </p>
                </div>
              </div>
              <Button
                danger
                size="small"
                onClick={handleRemoveAllInvalidDrafts}
                className="bg-white border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white font-semibold shrink-0 h-8 text-xs rounded-lg shadow-sm"
              >
                Remove Invalid ({invalidEanDrafts.length})
              </Button>
            </div>
          )}

          {/* Untranslated Images Alert */}
          {hasUntranslatedImages && !hasInvalidEan && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs shadow-sm">
              <div className="flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.75.75 0 00.747-.75v-2a.75.75 0 00-.75-.75H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-bold text-amber-900">Publishing Blocked: {untranslatedDrafts.length} product(s) have untranslated images.</div>
                  <p className="mt-0.5 text-amber-700 leading-relaxed">
                    All product pictures must be translated to Dutch before publishing. Click <strong>Translate All Images</strong> above to proceed.
                  </p>
                </div>
              </div>
              <Button
                type="primary"
                size="small"
                onClick={handleTranslateAllInBulk}
                loading={isBulkTranslating}
                className="bg-brand hover:bg-brand-dark text-white font-semibold shrink-0 h-8 text-xs rounded-lg shadow-sm"
              >
                Translate All Images
              </Button>
            </div>
          )}

          <Button
            type="primary"
            size="large"
            onClick={handleBulkPublish}
            loading={isPublishing}
            disabled={isGeneratingDrafts || drafts.length === 0 || hasInvalidEan || hasUntranslatedImages}
            className="bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed h-11 text-sm font-semibold rounded-xl shadow-md"
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
