import { useState, useEffect } from "react";
import { Modal, Input, Select, Button, Spin, InputNumber, Tabs, Image, DatePicker } from "antd";
import toast from "react-hot-toast";
import {
  useGetDraftQuery,
  useUpdateDraftMutation,
  usePublishDraftMutation,
  useTranslateSingleImageMutation,
  useRevertSingleImageMutation,
} from "../../Redux/productApis";
import { useGetBolCredentialsQuery } from "../../Redux/connectionApis";
import { useUI } from "../../Provider/ContextProvider";
import { url as API_URL } from "../../Redux/main/server";
import { getToken } from "../../utils/session";

const { TextArea } = Input;

const Field = ({ label, children, required }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const calcSellingPrice = (val) => {
  if (val == null || val === "" || isNaN(val)) return 39.95;
  const num = parseFloat(String(val).replace(/[^\d.,]/g, "").replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return 39.95;
  return num;
};

const DraftEditModal = ({ draftId, onClose, isBulkMode = false }) => {
  const { setSettingsOpen, setSettingsTab, activeBolAccountId } = useUI();
  const [selectedAccount, setSelectedAccount] = useState(activeBolAccountId || null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [originalPhotos, setOriginalPhotos] = useState([]);

  const { data: draftRes, isFetching: loadingDraft } = useGetDraftQuery(draftId, {
    skip: !draftId,
  });
  const draft = draftRes?.data;

  const { data: bolCreds = [] } = useGetBolCredentialsQuery();

  const [updateDraft, { isLoading: updating }] = useUpdateDraftMutation();
  const [publishDraft, { isLoading: publishing }] = usePublishDraftMutation();
  const [translateSingleImage] = useTranslateSingleImageMutation();
  const [revertSingleImage] = useRevertSingleImageMutation();

  const [form, setForm] = useState({
    title: "",
    ean: "",
    bol_price: "",
    stock_amount: 10,
    condition: "NEW",
    delivery_code: "24uurs-23",
    reference: "",
    description: "",
    attributes: {},
    photos: [],
    schedule_at: null,
  });

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [translatingIndex, setTranslatingIndex] = useState(null);
  const [revertingIndex, setRevertingIndex] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const sanitizeAntiAmazonAndEmojiText = (text) => {
    if (!text || typeof text !== "string") return text || "";
    
    // 1. Strip Amazon keywords
    const amazonPatterns = [
      /\bamazon(?:\.nl|\.de|\.com|\.co\.uk)?\b/gi,
      /\basin\b/gi,
      /\bfulfilled by amazon\b/gi,
      /\bfba\b/gi,
      /\bamazon's choice\b/gi,
      /\bprime\b/gi
    ];
    let cleaned = text;
    amazonPatterns.forEach(pat => { cleaned = cleaned.replace(pat, ""); });

    // 2. Strip Emojis, Symbols (®, ™, etc.)
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B06}\u{2934}\u{2935}\u{25AA}-\u{25FE}\u{00AE}\u{00A9}\u{2122}]/gu, '');

    // 3. Strip trailing dashes or punctuation
    cleaned = cleaned.replace(/[-–—]\s*$/g, '').trim();

    // 4. Normalize spaces
    cleaned = cleaned.replace(/  +/g, ' ');

    return cleaned.trim();
  };

  const handleCustomFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("bol_access_token") || getToken() || "";
      const res = await fetch(`${API_URL}/bol/upload-image`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      if (data.url) {
        setForm(prev => {
          const newPhotos = [...prev.photos, data.url];
          setSelectedPhotos(sPrev => [...sPrev, prev.photos.length]);
          return { ...prev, photos: newPhotos };
        });
        toast.success("Custom image uploaded successfully!");
      }
    } catch (err) {
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const isPhotoTranslated = (index, url) => {
    if (!url) return false;
    if (originalPhotos[index] && originalPhotos[index] !== url) return true;
    if (typeof url === 'string' && url.includes("translated-images")) return true;
    return false;
  };

  const handleTranslateImage = async (index, e) => {
    e.stopPropagation();
    setTranslatingIndex(index);
    try {
      const res = await translateSingleImage({ 
        draftId, 
        bolAccountId: selectedAccount, 
        photoIndex: index 
      }).unwrap();
      
      if (res.success && res.translated_url) {
        setForm(prev => {
          const newPhotos = [...prev.photos];
          newPhotos[index] = res.translated_url;
          return { ...prev, photos: newPhotos };
        });
        if (res.original_photos) {
          setOriginalPhotos(res.original_photos);
        } else if (res.original_url) {
          setOriginalPhotos(prev => {
            const updated = [...prev];
            updated[index] = res.original_url;
            return updated;
          });
        }
        toast.success("Image translated successfully!");
      }
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to translate image.");
    } finally {
      setTranslatingIndex(null);
    }
  };

  const handleRevertImage = async (index, e) => {
    e.stopPropagation();
    setRevertingIndex(index);
    try {
      const res = await revertSingleImage({
        draftId,
        bolAccountId: selectedAccount,
        photoIndex: index
      }).unwrap();

      if (res.success && res.reverted_url) {
        setForm(prev => {
          const newPhotos = [...prev.photos];
          newPhotos[index] = res.reverted_url;
          return { ...prev, photos: newPhotos };
        });
        toast.success("Image reverted to original!");
      }
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to revert image.");
    } finally {
      setRevertingIndex(null);
    }
  };

  useEffect(() => {
    if (draft) {
      const rawPrice = draft.bol_price || draft.estimated_price || "";
      const roundedPrice = calcSellingPrice(rawPrice);

      const rawTitle = draft.spreadsheet_title || draft.title || "";
      const cleanTitle = sanitizeAntiAmazonAndEmojiText(rawTitle);

      const cleanDesc = sanitizeAntiAmazonAndEmojiText(draft.description || "");

      const cleanAttrs = {};
      if (draft.attributes && typeof draft.attributes === "object") {
        const draftAsin = (draft.asin || "").toUpperCase();
        Object.entries(draft.attributes).forEach(([k, v]) => {
          const rawK = String(k).trim();
          const rawV = String(v).trim();
          const keyUpper = rawK.toUpperCase();
          const valUpper = rawV.toUpperCase();

          if (!rawK || keyUpper === "ASIN" || keyUpper.includes("ASIN")) return;
          if (draftAsin && (valUpper === draftAsin || valUpper.includes(draftAsin))) return;

          const cleanedK = sanitizeAntiAmazonAndEmojiText(rawK);
          const cleanedV = sanitizeAntiAmazonAndEmojiText(rawV);

          if (!cleanedK || !cleanedV) return;

          cleanAttrs[cleanedK] = cleanedV;
        });
      }

      const deliveryCodeDefault = (draft.delivery_code && draft.delivery_code !== "24uurs-23") ? draft.delivery_code : "1-8d";

      setForm({
        title: cleanTitle,
        ean: draft.ean || "",
        bol_price: roundedPrice,
        stock_amount: draft.stock_amount ?? 10,
        condition: draft.condition || "NEW",
        delivery_code: deliveryCodeDefault,
        reference: draft.reference || draft.asin || "",
        description: cleanDesc,
        attributes: cleanAttrs,
        photos: draft.photos || [],
      });
      setOriginalPhotos(draft.original_photos || draft.photos || []);
      if (draft.photos?.length > 0) {
        setSelectedPhotos(draft.photos.map((_, i) => i));
      } else {
        setSelectedPhotos([]);
      }
    }
  }, [draft]);

  useEffect(() => {
    if (activeBolAccountId && !selectedAccount) {
      setSelectedAccount(activeBolAccountId);
    }
  }, [activeBolAccountId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePhotoSelection = (index) => {
    setSelectedPhotos((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const handleSave = async () => {
    try {
      const photosToSave = form.photos.filter((_, i) => selectedPhotos.includes(i));
      await updateDraft({
        id: draftId,
        account_id: selectedAccount,
        ...form,
        photos: photosToSave,
      }).unwrap();
      return true;
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update draft");
      return false;
    }
  };

  const handlePublish = async () => {
    const activeCred = bolCreds.find(c => c.account_id === selectedAccount);
    const hasCreds = activeCred?.client_id && activeCred?.is_secret_set;
    if (!hasCreds) {
      toast.error("You must connect your Bol.com credentials first! Opening settings...");
      onClose();
      setSettingsTab("connection");
      setSettingsOpen(true);
      return;
    }

    const saved = await handleSave();
    if (!saved) return;

    if (isBulkMode) {
      toast.success("Draft saved successfully!");
      onClose();
      return;
    }

    try {
      if (scheduleEnabled && form.schedule_at) {
        const token = localStorage.getItem("bol_access_token") || localStorage.getItem("bol_access_token_v2") || getToken() || "";
        const res = await fetch(`${API_URL}/bol/drafts/bulk-publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            draft_ids: [draftId],
            account_id: selectedAccount,
            condition: form.condition,
            delivery_code: form.delivery_code,
            schedule_at: form.schedule_at.toISOString()
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to schedule");
        toast.success("Draft successfully scheduled for publishing!");
        onClose();
      } else {
        await publishDraft({ draftId, bolAccountId: selectedAccount }).unwrap();
        toast.success("Draft published to Bol.com successfully!");
        onClose();
      }
    } catch (err) {
      toast.error(err?.message || err?.data?.detail || "Failed to publish to Bol.com");
    }
  };

  if (!draftId) return null;

  return (
    <Modal
      open={!!draftId}
      onCancel={onClose}
      footer={null}
      centered
      width={900}
      className="draft-modal"
    >
      <div className="font-poppins pt-1 pb-1">
        <div className="flex items-start justify-between border-b border-gray-100 pb-3 mb-2">
          <div className="flex items-start gap-3">
            {isBulkMode && (
              <button
                onClick={onClose}
                className="mt-1 p-1.5 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-500 hover:text-gray-800"
                title="Back to Bulk Publish"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Final Review & Publish</h2>
              <p className="text-[13px] font-medium text-gray-500 mt-0.5">
                Review the complete product data payload that will be submitted to Bol.com.
              </p>
            </div>
          </div>
        </div>

        {loadingDraft ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : (
          <div className="flex flex-col">
            <Tabs
              defaultActiveKey="1"
              className="custom-tabs"
              items={[
                {
                  key: '1',
                  label: 'Core Offer',
                  children: (
                    <div className="py-4 space-y-5">
                      <Field label="Product Title" required>
                        <TextArea
                          value={form.title}
                          onChange={(e) => handleChange("title", e.target.value)}
                          rows={2}
                          className="rounded-lg text-[14px] text-gray-800"
                        />
                      </Field>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Publish To Account" required>
                          <Select
                            value={selectedAccount}
                            onChange={(val) => setSelectedAccount(val)}
                            placeholder="Select Bol.com Account"
                            className="w-full h-10 draft-select"
                            options={bolCreds.map(c => ({
                              value: c.account_id,
                              label: c.account_name || c.client_id.substring(0,8) + '...'
                            }))}
                          />
                        </Field>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <Field label="EAN Number" required>
                          <Input
                            value={form.ean}
                            onChange={(e) => handleChange("ean", e.target.value)}
                            className="rounded-lg h-10 text-[14px] text-gray-800"
                          />
                        </Field>
                        
                        <div className="flex flex-col justify-end">
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
                                    className="w-full h-9" 
                                    onChange={(v) => handleChange("schedule_at", v?.toDate() || null)}
                                    />
                                </Field>
                            )}
                        </div>

                        <div className="col-span-1 md:col-span-2 border-t border-gray-100 my-1"></div>

                        <Field label="Bol.com Price (€)" required>
                          <InputNumber
                            value={form.bol_price}
                            onChange={(val) => handleChange("bol_price", val)}
                            className="w-full rounded-lg flex items-center text-[14px] font-bold"
                            min={0}
                            step={0.01}
                            prefix={<span className="text-gray-400 mr-1">€</span>}
                          />
                        </Field>
                        <Field label="Stock Amount" required>
                          <InputNumber
                            value={form.stock_amount}
                            onChange={(val) => handleChange("stock_amount", val)}
                            className="w-full rounded-lg flex items-center text-[14px]"
                            min={0}
                            step={1}
                          />
                        </Field>

                        <Field label="Condition" required>
                          <Select
                            value={form.condition}
                            onChange={(val) => handleChange("condition", val)}
                            className="w-full h-10 draft-select"
                            options={[
                              { label: "New", value: "NEW" },
                              { label: "As New", value: "AS_NEW" },
                              { label: "Good", value: "GOOD" },
                              { label: "Reasonable", value: "REASONABLE" },
                              { label: "Moderate", value: "MODERATE" },
                            ]}
                          />
                        </Field>
                        <Field label="Delivery Code" required>
                          <Select
                            value={form.delivery_code}
                            onChange={(val) => handleChange("delivery_code", val)}
                            className="w-full h-10 draft-select"
                            options={[
                              { label: "1-8d (1-8 Days)", value: "1-8d" },
                              { label: "1-2d (1-2 Days)", value: "1-2d" },
                              { label: "2-3d (2-3 Days)", value: "2-3d" },
                              { label: "3-5d (3-5 Days)", value: "3-5d" },
                              { label: "4-8d (4-8 Days)", value: "4-8d" },
                              { label: "24uurs-23", value: "24uurs-23" },
                              { label: "24uurs-22", value: "24uurs-22" },
                              { label: "24uurs-21", value: "24uurs-21" },
                              { label: "MijnLeverbelofte", value: "MijnLeverbelofte" },
                              { label: "VVB", value: "VVB" },
                            ]}
                          />
                        </Field>
                      </div>
                    </div>
                  )
                },
                {
                  key: '2',
                  label: 'Content & Description',
                  children: (
                    <div className="py-4 space-y-6">
                      <Field label="Product Description">
                        <TextArea
                          value={form.description}
                          onChange={(e) => handleChange("description", e.target.value)}
                          rows={10}
                          className="rounded-xl text-[13px] font-medium text-gray-700 leading-relaxed thin-scrollbar"
                          placeholder="Rich product description for Bol.com..."
                        />
                      </Field>
                      
                      <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl">
                         <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-4">Technical Specifications (Read Only)</h3>
                         {Object.keys(form.attributes || {}).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                              {Object.entries(form.attributes).map(([k, v]) => {
                                const rawK = String(k).trim();
                                const rawV = String(v).trim();
                                const draftAsin = (draft?.asin || "").toUpperCase();
                                if (!rawK || rawK.toUpperCase() === "ASIN") return null;
                                if (draftAsin && rawV.toUpperCase().includes(draftAsin)) return null;
                                return (
                                  <div key={k} className="flex flex-col border-b border-gray-200 pb-2">
                                     <span className="text-[11px] font-bold text-gray-400 uppercase">{rawK}</span>
                                     <span className="text-[13px] font-semibold text-gray-800">{rawV}</span>
                                  </div>
                                );
                              })}
                            </div>
                         ) : (
                            <p className="text-sm text-gray-400 font-medium">No technical specifications provided.</p>
                         )}
                      </div>
                    </div>
                  )
                },
                {
                  key: '3',
                  label: 'Media Gallery',
                  children: (
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[13px] text-gray-500 font-medium">Select images or upload custom images to include in the Bol.com listing.</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {/* Upload custom image dropzone card */}
                        <label className="relative aspect-square bg-slate-50 border-2 border-dashed border-slate-300 hover:border-brand rounded-2xl flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-brand/5 transition-all duration-200 group shadow-sm">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleCustomFileUpload} 
                            disabled={uploadingImage}
                          />
                          {uploadingImage ? (
                            <Spin size="small" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-brand group-hover:scale-110 transition-transform mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            </div>
                          )}
                          <span className="text-[12px] font-semibold text-slate-700">Upload Image</span>
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5">JPG / PNG</span>
                        </label>

                        {form.photos?.length > 0 && form.photos.map((src, i) => (
                          <div 
                            key={i} 
                            className={`relative aspect-square bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center p-2 group ${selectedPhotos.includes(i) ? 'border-brand ring-2 ring-brand/10' : 'border-slate-200/80 hover:border-slate-300'}`}
                          >
                             {translatingIndex === i || revertingIndex === i ? (
                               <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                                 <Spin size="small" />
                                 <span className="text-[11px] text-brand font-semibold mt-2">
                                   {revertingIndex === i ? "Reverting..." : "Translating..."}
                                 </span>
                               </div>
                             ) : null}
                             <Image src={src} alt={`Product ${i+1}`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                             
                             <div className={`absolute inset-0 transition-all duration-200 pointer-events-none ${selectedPhotos.includes(i) ? 'bg-transparent' : 'bg-slate-900/20 group-hover:bg-slate-900/10'}`}></div>
                             
                             {isPhotoTranslated(i, src) ? (
                               <>
                                 <div className="absolute top-2.5 left-2.5 z-10">
                                   <span className="px-2.5 py-0.5 bg-emerald-600/90 backdrop-blur-md text-white rounded-full text-[10px] font-bold tracking-wide shadow-sm flex items-center gap-1 border border-emerald-400/30">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 text-white">
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                     </svg>
                                     Translated
                                   </span>
                                 </div>
                                 
                                 <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                                   <button
                                     type="button"
                                     title="Undo translation & revert to original photo"
                                     onClick={(e) => handleRevertImage(i, e)}
                                     className="px-2.5 py-1 bg-slate-900/85 hover:bg-rose-600 text-white backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                                   >
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                     </svg>
                                     Undo Translation
                                   </button>
                                 </div>
                               </>
                             ) : (
                               <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                                 <button 
                                   type="button"
                                   title="Translate Image"
                                   onClick={(e) => handleTranslateImage(i, e)}
                                   className="px-2.5 py-1 bg-white/95 hover:bg-brand hover:text-white backdrop-blur-md border border-slate-200/80 rounded-xl text-[10px] font-semibold text-slate-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                 >
                                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                     <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                                   </svg>
                                   Translate
                                 </button>
                               </div>
                             )}

                             <div 
                               className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer z-10 ${selectedPhotos.includes(i) ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/20' : 'bg-white/80 backdrop-blur-md border border-slate-300 text-transparent hover:bg-white hover:border-slate-400'}`} 
                               onClick={(e) => { e.stopPropagation(); togglePhotoSelection(i); }}
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                 <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                               </svg>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
              ]}
            />

            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
              <Button onClick={onClose} className="h-10 px-5 rounded-lg font-medium border-gray-200 text-gray-600">
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handlePublish}
                loading={publishing || updating}
                className="h-10 px-6 rounded-lg font-semibold bg-brand shadow-sm hover:opacity-90 transition-opacity"
              >
                {isBulkMode ? "Save Draft" : (scheduleEnabled ? "Schedule Publish" : "Publish to Bol.com")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .draft-modal .ant-modal-content {
           border-radius: 24px;
           padding: 24px 32px;
        }
        .draft-modal .ant-input-number .ant-input-number-input {
           height: 38px;
        }
        .draft-select .ant-select-selector {
           border-radius: 8px !important;
           height: 40px !important;
           display: flex;
           align-items: center;
        }
        .custom-tabs .ant-tabs-nav::before {
           border-bottom: 2px solid #f3f4f6;
        }
        .custom-tabs .ant-tabs-tab {
           padding: 12px 0;
           margin: 0 32px 0 0;
        }
        .custom-tabs .ant-tabs-tab-btn {
           font-weight: 700;
           font-size: 14px;
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

export default DraftEditModal;
