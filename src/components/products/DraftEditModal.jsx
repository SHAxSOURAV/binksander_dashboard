import { useState, useEffect, useMemo } from "react";
import { Modal, Input, Select, Button, Spin, InputNumber, Tabs, Image, DatePicker } from "antd";
import toast from "react-hot-toast";
import {
  useGetDraftQuery,
  useUpdateDraftMutation,
  usePublishDraftMutation,
  useTranslateDraftImagesMutation,
  useTranslateSingleImageMutation,
  useRevertSingleImageMutation,
  useEnrichDraftAttributesMutation,
  useGetDraftBolPayloadPreviewQuery,
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

// Despite the name this only parses the draft's already-computed bol_price into a
// number (falling back to the floor for junk input) — the markup was applied on the
// backend with the account's multiplier before the draft was ever created.
const calcSellingPrice = (val) => {
  if (val == null || val === "" || isNaN(val)) return 39.95;
  const num = parseFloat(String(val).replace(/[^\d.,]/g, "").replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return 39.95;
  return num;
};

const sanitizeAntiAmazonAndEmojiText = (text, sourceTitle = "") => {
  if (!text || typeof text !== "string") return text || "";
  
  // Extract dynamic brand from title (e.g. Warmara, Quovo, Lumina)
  let brand = "";
  const cleanTitle = (sourceTitle || "").trim();
  if (cleanTitle) {
    const words = cleanTitle.split(/\s+/);
    if (words.length > 0) {
      brand = words[0].replace(/[®™©:,\(\)\[\]\.\-_/]/g, "").trim();
    }
  }

  let cleaned = text;

  // 1. Strip Amazon keywords
  const amazonPatterns = [
    /\bamazon(?:\.nl|\.de|\.com|\.co\.uk)?\b/gi,
    /\basin\b/gi,
    /\bfulfilled by amazon\b/gi,
    /\bfba\b/gi,
    /\bamazon's choice\b/gi,
    /\bprime\b/gi
  ];
  amazonPatterns.forEach(pat => { cleaned = cleaned.replace(pat, " "); });

  // 2. Strip Prohibited seller claims & contact info
  const prohibitedClaims = [
    /\b(?:op werkdagen )?voor \d{1,2}[:.]\d{2}(?: uur)? besteld(?:,)? morgen in huis\b/gi,
    /\bvandaag besteld(?:,)? morgen in huis\b/gi,
    /\bgratis verzending\b/gi,
    /\bkostenloze verzending\b/gi,
    /\b100% tevredenheidsgarantie\b/gi,
    /\bniet goed(?:,)? geld terug\b/gi,
    /\blaagste prijs(?:garantie)?\b/gi,
    /\bhttps?:\/\/\S+/gi,
    /\bwww\.\S+/gi,
    /\b[\w\.-]+@[\w\.-]+\.\w+\b/gi,
    /\b(?:\+31|06|0031)\s*\d{8,}\b/gi
  ];
  prohibitedClaims.forEach(pat => { cleaned = cleaned.replace(pat, ""); });

  // 3. Clean Asian brackets into structured bullet headings: 【Title】 -> "\n\n• Title:\n"
  cleaned = cleaned.replace(/【(.*?)】\s*/g, '\n\n• $1:\n');
  cleaned = cleaned.replace(/\[(.*?)\]\s*/g, '\n\n• $1:\n');
  cleaned = cleaned.replace(/「/g, '"').replace(/」/g, '"').replace(/『/g, '"').replace(/』/g, '"');
  cleaned = cleaned.replace(/《/g, '<').replace(/》/g, '>').replace(/〔/g, '(').replace(/〕/g, ')');

  // 4. Replace competitor/source brands with the actual listing brand (e.g. vancasso -> Warmara / Quovo)
  if (brand && brand.length >= 2) {
    const competitorPatterns = [
      /\bvancasso\s*(?:Reno|Bella|Bonita|Haruka|Navia|Simphonio|Natsuki)?\b/gi,
      /\bcimetech\b/gi,
      /\bhomikit\b/gi,
      /\bteamfar\b/gi,
      /\bklarstein\b/gi,
      /\bblitzwolf\b/gi,
      /\bsongmics\b/gi,
      /\bvasagle\b/gi,
      /\bfeandrea\b/gi,
      /\banker\b/gi
    ];
    competitorPatterns.forEach(pat => {
      cleaned = cleaned.replace(pat, ` ${brand} `);
    });
  }

  // 5. Strip Emojis and decorative symbols (Preserve Trademark symbols: ®, ™, ©)
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B06}\u{2934}\u{2935}\u{25AA}-\u{25FE}]/gu, ' ');

  // 6. Strip invisible Unicode variation selectors and zero-width characters
  cleaned = cleaned.replace(/[\u{FE00}-\u{FE0F}\u{200B}-\u{200D}\u{FEFF}\u00a0\u200e\u200f\u202a-\u202e\u2060-\u206f\u00ad]/gu, '');

  // 7. Normalize linebreaks & multiple spaces (preserve paragraph structure)
  const lines = cleaned.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim());
  let formattedText = "";
  let blankCount = 0;
  for (const line of lines) {
    if (!line) {
      blankCount++;
      if (blankCount <= 1 && formattedText) {
        formattedText += "\n\n";
      }
    } else {
      blankCount = 0;
      formattedText += line + "\n";
    }
  }

  return formattedText.trim().slice(0, 5000);
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
  const [translateDraftImages, { isLoading: translatingAll }] = useTranslateDraftImagesMutation();
  const [translateSingleImage] = useTranslateSingleImageMutation();
  const [revertSingleImage] = useRevertSingleImageMutation();
  const [enrichDraftAttributes, { isLoading: enrichingAttributes }] = useEnrichDraftAttributesMutation();

  const { data: bolPreviewData, isFetching: loadingPreview, refetch: refetchPreview } = useGetDraftBolPayloadPreviewQuery(
    { draftId, bolAccountId: selectedAccount },
    { skip: !draftId }
  );

  const [specViewMode, setSpecViewMode] = useState("categorized"); // "categorized" | "payload"
  const [payloadType, setPayloadType] = useState("content"); // "content" | "offer"

  const [form, setForm] = useState({
    title: "",
    ean: "",
    bol_price: "",
    stock_amount: 10,
    condition: "NEW",
    delivery_code: "1-8d",
    reference: "",
    description: "",
    attributes: {},
    photos: [],
    schedule_at: null,
  });

  const [customUploadedUrls, setCustomUploadedUrls] = useState(new Set());
  const [isDraftTranslated, setIsDraftTranslated] = useState(false);
  const [verifiedPhotoIndexes, setVerifiedPhotoIndexes] = useState(new Set());
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [translatingIndex, setTranslatingIndex] = useState(null);
  const [revertingIndex, setRevertingIndex] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isPhotoTranslated = (index, url) => {
    if (!url) return false;
    // 1. Custom uploaded image by user
    if (customUploadedUrls.has(url)) return true;
    // 2. Cloud / S3 translated image URL
    if (typeof url === 'string' && url.includes("translated-images")) return true;
    // 3. Modified from original photo URL
    if (originalPhotos[index] && originalPhotos[index] !== url) return true;
    // 4. Single photo explicitly checked & verified clean by translation engine
    if (verifiedPhotoIndexes.has(index)) return true;
    return false;
  };

  // Translation & Validation State Checks for all selected photos
  const selectedCount = selectedPhotos.length;
  const untranslatedSelectedPhotos = form.photos.filter((src, i) => selectedPhotos.includes(i) && !isPhotoTranslated(i, src));
  const untranslatedCount = untranslatedSelectedPhotos.length;
  const hasUntranslatedImages = selectedCount === 0 || untranslatedCount > 0;

  const cleanEan = (form.ean || "").replace(/\D/g, "");
  const isValidEan = cleanEan.length === 13;

  const isPublishDisabled = (
    publishing ||
    updating ||
    translatingAll ||
    translatingIndex !== null ||
    (!isBulkMode && (hasUntranslatedImages || !isValidEan || !form.title?.trim() || !form.bol_price))
  );

  const liveOfferPayload = useMemo(() => {
    const cleanStock = Math.max(parseInt(form.stock_amount, 10) || 1, 1);
    const cleanPrice = parseFloat(form.bol_price) || 39.95;
    const cleanEanVal = (form.ean || "").replace(/\D/g, "");

    const deliveryMap = {
      "24uurs-15": { minimumDaysToCustomer: 0, maximumDaysToCustomer: 1, ultimateOrderTime: "15:00" },
      "24uurs-23": { minimumDaysToCustomer: 0, maximumDaysToCustomer: 1, ultimateOrderTime: "23:00" },
      "1-2d": { minimumDaysToCustomer: 1, maximumDaysToCustomer: 2 },
      "2-3d": { minimumDaysToCustomer: 2, maximumDaysToCustomer: 3 },
      "3-5d": { minimumDaysToCustomer: 3, maximumDaysToCustomer: 5 },
      "4-8d": { minimumDaysToCustomer: 4, maximumDaysToCustomer: 8 },
      "1-8d": { minimumDaysToCustomer: 1, maximumDaysToCustomer: 8 },
    };
    const deliveryPromise = { ...(deliveryMap[form.delivery_code] || { minimumDaysToCustomer: 1, maximumDaysToCustomer: 8 }) };
    if (deliveryPromise.minimumDaysToCustomer > 0 && deliveryPromise.ultimateOrderTime) {
      delete deliveryPromise.ultimateOrderTime;
    }

    const eoId = bolPreviewData?.exact_offer_payload?.economicOperatorId || "82a254a0-3ecf-4d82-abc3-8ad0355ccc92";
    const profileId = bolPreviewData?.exact_offer_payload?.fulfilment?.profileId;

    const fulfilmentObj = {
      method: "FBR",
      schedule: "BOL_DELIVERY_PROMISE"
    };
    if (profileId) {
      fulfilmentObj.profileId = profileId;
    } else {
      fulfilmentObj.deliveryPromise = deliveryPromise;
    }

    const isAmzAsin = /^B0[A-Z0-9]{8}$/i.test((form.reference || "").trim());
    const cleanRef = (!form.reference || isAmzAsin) ? null : form.reference.trim().slice(0, 20);

    const payload = {
      ean: cleanEanVal,
      unknownProductTitle: form.title || form.spreadsheet_title || "",
      economicOperatorId: eoId,
      onHoldByRetailer: false,
      condition: {
        category: (form.condition || "NEW").toUpperCase()
      },
      pricing: {
        bundlePrices: [
          {
            quantity: 1,
            unitPrice: cleanPrice
          }
        ]
      },
      stock: {
        amount: cleanStock,
        managedByRetailer: true
      },
      countryAvailabilities: [
        { countryCode: "NL" },
        { countryCode: "BE" }
      ],
      fulfilment: fulfilmentObj
    };

    if (cleanRef) {
      payload.reference = cleanRef;
    }

    return payload;
  }, [form.ean, form.title, form.spreadsheet_title, form.reference, form.bol_price, form.stock_amount, form.condition, form.delivery_code, bolPreviewData]);

  const liveContentPayload = useMemo(() => {
    if (!bolPreviewData?.exact_content_payload) {
      return {
        status: "Loading exact Bol.com Data Model v10 payload..."
      };
    }

    const payload = JSON.parse(JSON.stringify(bolPreviewData.exact_content_payload));
    if (form.chunk_id) payload.chunkId = String(form.chunk_id);
    
    // Update live core attributes
    const eanAttr = payload.attributes?.find(a => a.id === "EAN");
    if (eanAttr) eanAttr.values = [{ value: (form.ean || "").replace(/\D/g, "") }];

    const nameAttr = payload.attributes?.find(a => a.id === "Name");
    if (nameAttr) nameAttr.values = [{ value: form.title || "" }];

    const descAttr = payload.attributes?.find(a => a.id === "Description");
    if (descAttr) descAttr.values = [{ value: sanitizeAntiAmazonAndEmojiText(form.description || "", form.title || "") }];

    // Only update valid Data Model attributes that exist in the payload (excluding top-level form fields)
    const topLevelKeys = ["description", "beschrijving", "name", "titel", "title", "ean", "brand", "merk"];
    if (form.attributes && typeof form.attributes === "object") {
      Object.entries(form.attributes).forEach(([k, v]) => {
        if (!k || v == null || !String(v).trim()) return;
        if (topLevelKeys.includes(k.toLowerCase())) return;
        const existing = payload.attributes?.find(a => a.id.toLowerCase() === k.toLowerCase());
        if (existing) {
          existing.values = Array.isArray(v) ? v.map(item => ({ value: String(item) })) : [{ value: String(v) }];
        }
      });
    }

    // Live assets update
    payload.assets = (form.photos || []).filter(u => u && typeof u === 'string').map((url, idx) => ({
      url,
      labels: [idx === 0 ? "FRONT" : "ADDITIONAL"]
    }));

    return payload;
  }, [bolPreviewData, form.chunk_id, form.ean, form.title, form.description, form.attributes, form.photos]);



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
        setCustomUploadedUrls(prev => new Set([...prev, data.url]));
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

  const handleTranslateImage = async (index, e) => {
    e.stopPropagation();
    setTranslatingIndex(index);
    try {
      const res = await translateSingleImage({ 
        draftId, 
        bolAccountId: selectedAccount, 
        photoIndex: index 
      }).unwrap();
      
      if (res.success) {
        setVerifiedPhotoIndexes(prev => new Set([...prev, index]));
        if (res.translated_url) {
          setForm(prev => {
            const newPhotos = [...prev.photos];
            newPhotos[index] = res.translated_url;
            return { ...prev, photos: newPhotos };
          });
        }
        if (res.original_photos) {
          setOriginalPhotos(res.original_photos);
        } else if (res.original_url) {
          setOriginalPhotos(prev => {
            const updated = [...prev];
            updated[index] = res.original_url;
            return updated;
          });
        }
        toast.success(res.message || (res.has_text === false ? "No text found — image is clean and ready!" : "Image translated successfully!"));
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
        setVerifiedPhotoIndexes(prev => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
        setIsDraftTranslated(false);
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

  const handleTranslateAllImages = async () => {
    if (!draftId) return;
    try {
      const res = await translateDraftImages({
        draftId,
        bolAccountId: selectedAccount
      }).unwrap();
      
      if (res.success && res.data?.photos) {
        setIsDraftTranslated(true);
        setVerifiedPhotoIndexes(new Set(res.data.photos.map((_, i) => i)));
        setForm(prev => ({
          ...prev,
          photos: res.data.photos
        }));
        if (res.data.original_photos) {
          setOriginalPhotos(res.data.original_photos);
        }
        toast.success("All pictures checked & translated successfully!");
      }
    } catch (err) {
      toast.error(err?.data?.detail || err?.message || "Failed to translate all images.");
    }
  };

  const handleEnrichAttributes = async () => {
    if (!draftId) return;
    try {
      const res = await enrichDraftAttributes({
        draftId,
        bolAccountId: selectedAccount
      }).unwrap();

      if (res.success && res.attributes) {
        setForm(prev => ({
          ...prev,
          attributes: res.attributes
        }));
        if (typeof refetchPreview === 'function') {
          refetchPreview();
        }
        toast.success(res.message || "AI auto-filled all mandatory attributes!");
      }
    } catch (err) {
      toast.error(err?.data?.detail || err?.message || "Failed to auto-fill mandatory attributes.");
    }
  };

  const handleAttributeChange = (attrKey, value) => {
    setForm(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrKey]: value
      }
    }));
  };

  useEffect(() => {
    if (draft) {
      const rawPrice = draft.bol_price || draft.estimated_price || "";
      const roundedPrice = calcSellingPrice(rawPrice);

      const rawTitle = draft.spreadsheet_title || draft.title || "";
      const cleanTitle = sanitizeAntiAmazonAndEmojiText(rawTitle);

      const cleanDesc = sanitizeAntiAmazonAndEmojiText(draft.description || "", cleanTitle);

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
          let cleanedV = sanitizeAntiAmazonAndEmojiText(rawV);

          // Prevent numeric/count attributes from having stale 'Zichtbaar'
          const isNumericAttr = /number of|number pieces|aantal|persons|personen|pieces|delen|stuks|power|watt/i.test(cleanedK);
          if (isNumericAttr && (cleanedV.toLowerCase() === "zichtbaar" || cleanedV.toLowerCase() === "niet van toepassing" || cleanedV.toLowerCase() === "y" || cleanedV.toLowerCase() === "n")) {
            const mCount = (cleanTitle + " " + cleanDesc).match(/(\d+)\s*(?:delig|delige|stuks|pack|pcs|stk|teilig|piece|pieces|persoon|personen)/i);
            cleanedV = mCount ? mCount[1] : "1";
          }

          cleanAttrs[cleanedK] = cleanedV;
        });
      }

      // Enforce Brand strictly as the first word of the sheet title and CE Marking as Zichtbaar
      const firstWord = (cleanTitle || draft.spreadsheet_title || "").trim().split(/\s+/)[0]?.replace(/[®™©:,\(\)\[\]\.\-_/]/g, "") || "Warmara";
      cleanAttrs["Brand"] = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
      cleanAttrs["CE Marking"] = "Zichtbaar";

      // If Number of Pieces is missing in cleanAttrs, extract from title
      if (!cleanAttrs["Number of Pieces"]) {
        const mPieces = cleanTitle.match(/(\d+)\s*(?:delig|delige|stuks|pack|pcs|stk|teilig|piece|pieces)/i);
        if (mPieces) cleanAttrs["Number of Pieces"] = mPieces[1];
      }

      // If Suitable for Number of Persons is missing in cleanAttrs, extract or infer
      if (!cleanAttrs["Suitable for Number of Persons"]) {
        const mPersons = (cleanTitle + " " + cleanDesc).match(/(\d+)\s*(?:persoons|personen|persoon|person|persons)/i);
        const pCount = parseInt(cleanAttrs["Number of Pieces"] || "1", 10);
        cleanAttrs["Suitable for Number of Persons"] = mPersons ? mPersons[1] : (pCount >= 16 ? "6" : (pCount >= 8 ? "4" : "1"));
      }

      const deliveryCodeDefault = (draft.delivery_code && draft.delivery_code !== "24uurs-23") ? draft.delivery_code : "1-8d";

      setForm({
        title: cleanTitle,
        ean: draft.ean || "",
        bol_price: roundedPrice,
        stock_amount: draft.stock_amount ?? 10,
        condition: draft.condition || "NEW",
        delivery_code: deliveryCodeDefault,
        reference: (draft.reference && !/^B0[A-Z0-9]{8}$/i.test(draft.reference)) ? draft.reference : "",
        description: cleanDesc,
        attributes: cleanAttrs,
        photos: draft.photos || [],
        product_category: draft.product_category || "",
        chunk_id: draft.chunk_id || null,
        chunk_name: draft.chunk_name || "",
        chunk_recommendations: draft.chunk_recommendations || [],
      });
      const isTranslated = draft.images_translated === true;
      setIsDraftTranslated(isTranslated);
      if (draft.verified_photo_indexes?.length) {
        setVerifiedPhotoIndexes(new Set(draft.verified_photo_indexes));
      } else {
        const autoVerified = new Set();
        (draft.photos || []).forEach((u, i) => {
          if (typeof u === 'string' && u.includes("translated-images")) {
            autoVerified.add(i);
          }
        });
        setVerifiedPhotoIndexes(autoVerified);
      }

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
      return { id: draftId, ...form, photos: photosToSave };
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
      if (onClose) onClose(saved);
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

                        <Field label="Spreadsheet Category">
                          <Input
                            value={form.product_category}
                            onChange={(e) => handleChange("product_category", e.target.value)}
                            placeholder="Spreadsheet Product Category"
                            className="rounded-lg h-10 text-[14px] text-gray-800"
                          />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded border border-gray-200/80">
                        <Field label="Bol.com Product Group (Chunk ID)" required>
                          {form.chunk_recommendations?.length > 0 ? (
                            <Select
                              value={form.chunk_id ? String(form.chunk_id) : undefined}
                              onChange={(val) => {
                                const strVal = String(val);
                                const found = form.chunk_recommendations.find(r => String(r.chunkId || r.chunk_id) === strVal);
                                setForm(prev => ({
                                  ...prev,
                                  chunk_id: strVal,
                                  chunk_name: found ? (found.chunkName || found.chunk_name || prev.product_category || "") : prev.chunk_name
                                }));
                              }}
                              placeholder="Select Bol Category Recommendation"
                              className="w-full h-10 draft-select"
                              options={form.chunk_recommendations.map(r => ({
                                value: String(r.chunkId || r.chunk_id),
                                label: `${r.chunkName || r.chunk_name || form.product_category || 'Chunk'} (${r.chunkId || r.chunk_id}) ${r.probability ? `- ${(r.probability * 100).toFixed(0)}% Match` : ''}`
                              }))}
                            />
                          ) : (
                            <Input
                              value={form.chunk_id || ""}
                              onChange={(e) => handleChange("chunk_id", e.target.value)}
                              placeholder="Enter Bol Chunk ID (e.g. 30006542)"
                              className="w-full rounded-lg h-10 text-[14px] text-gray-800"
                            />
                          )}
                        </Field>

                        <Field label="Bol Product Group Name">
                          <Input
                            value={form.chunk_name}
                            onChange={(e) => handleChange("chunk_name", e.target.value)}
                            placeholder="Product Group Name"
                            className="rounded-lg h-10 text-[14px] text-gray-800"
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
                      {/* Product Description */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                            Product Description <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                const cleaned = sanitizeAntiAmazonAndEmojiText(form.description || "", form.title || "");
                                handleChange("description", cleaned);
                                toast.success("Description formatted & cleaned for Bol.com!");
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-all active:scale-95 shadow-2xs cursor-pointer"
                              title="Strip Asian brackets 【】, remove Amazon terms, replace competitor brands, and format for Bol.com"
                            >
                              🪄 Clean for Bol.com
                            </button>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {(form.description || "").length} characters
                            </span>
                          </div>
                        </div>
                        <TextArea
                          value={form.description}
                          onChange={(e) => handleChange("description", e.target.value)}
                          rows={6}
                          className="rounded text-[13px] text-slate-800 leading-relaxed thin-scrollbar p-3.5 border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          placeholder="Rich Dutch product description for Bol.com..."
                        />
                      </div>

                      {/* Bol.com Data Model v10 Specifications Container */}
                      <div className="bg-white border border-slate-200/90 rounded-md overflow-hidden shadow-xs">
                        {/* Clean Top Header */}
                        <div className="px-5 py-4 bg-gray-50/80 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 text-base font-bold shadow-2xs">
                              🏷️
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                                  Bol.com Data Model Specifications
                                </h3>
                                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold border border-gray-200 text-gray-600">
                                  {bolPreviewData?.chunk_name || form.chunk_name || "General Category"} ({form.chunk_id || "Auto"})
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Level 0 & 1 attributes are strictly validated by Bol.com for the product to be published as "Te koop".
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {/* View Switcher Segmented Control */}
                            <div className="flex bg-slate-200/70 p-1 rounded text-xs font-semibold">
                              <button
                                type="button"
                                onClick={() => setSpecViewMode("categorized")}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs ${
                                  specViewMode === "categorized"
                                    ? "bg-white text-slate-800 shadow-xs font-bold"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                📋 Specifications
                              </button>
                              <button
                                type="button"
                                onClick={() => setSpecViewMode("payload")}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs ${
                                  specViewMode === "payload"
                                    ? "bg-white text-blue-700 shadow-xs font-bold"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {"{ }"} Live Bol Payload
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Content Area */}
                        {specViewMode === "categorized" ? (
                          <div className="p-5 space-y-6">
                            {/* 1. Mandatory Attributes Section */}
                            <div>
                              <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                    Mandatory Attributes (Level 0 & 1)
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Required English Attribute Keys & Dutch Values
                                  </span>
                                </div>
                                <span className="text-[11px] font-bold text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                  {bolPreviewData?.mandatory_attributes?.filter(a => Boolean(form.attributes?.[a.id] || a.value)).length || 0} of {bolPreviewData?.mandatory_attributes?.length || 0} Ready
                                </span>
                              </div>

                              {bolPreviewData?.mandatory_attributes?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                  {bolPreviewData.mandatory_attributes.map((attr) => {
                                    const currentVal = form.attributes?.[attr.id] || attr.value || "";
                                    const hasValue = Boolean(String(currentVal).trim());
                                    const allowed = attr.allowed_values || [];

                                    return (
                                      <div
                                        key={attr.id}
                                        className={`p-3.5 rounded border transition-all ${
                                          hasValue
                                            ? "bg-gray-50/60 border-slate-200/90 hover:border-slate-300"
                                            : "bg-amber-50/40 border-amber-200"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-1.5">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[12px] font-bold text-slate-800">
                                              {attr.id}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                              attr.level === 0 ? "border border-gray-300 text-gray-700" : "border border-gray-200 text-gray-500"
                                            }`}>
                                              Level {attr.level}
                                            </span>
                                          </div>
                                          {hasValue ? (
                                            <span className="text-[10px] font-bold text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                              Ready
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-bold text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1 animate-pulse">
                                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                              Required
                                            </span>
                                          )}
                                        </div>

                                        {allowed.length > 0 && allowed.length <= 15 ? (
                                          <Select
                                            value={currentVal || undefined}
                                            onChange={(val) => handleAttributeChange(attr.id, val)}
                                            placeholder={`Select ${attr.id}`}
                                            className="w-full h-8 text-[12px]"
                                            options={allowed.map((opt) => ({ value: opt, label: opt }))}
                                            allowClear
                                          />
                                        ) : (
                                          <Input
                                            value={currentVal}
                                            onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                                            placeholder={`Enter ${attr.id}`}
                                            className="w-full h-8 text-[12px] rounded-lg border-slate-200"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {Object.entries(form.attributes || {}).map(([k, v]) => {
                                    const rawK = String(k).trim();
                                    const rawV = String(v).trim();
                                    const draftAsin = (draft?.asin || "").toUpperCase();
                                    if (!rawK || rawK.toUpperCase() === "ASIN") return null;
                                    if (draftAsin && rawV.toUpperCase().includes(draftAsin)) return null;
                                    if (["DESCRIPTION", "BESCHRIJVING"].includes(rawK.toUpperCase())) return null;

                                    return (
                                      <div key={k} className="p-3 bg-gray-50/80 border border-slate-200/90 rounded">
                                        <span className="text-[11px] font-bold text-slate-600 block mb-1">
                                          {rawK}
                                        </span>
                                        <Input
                                          value={rawV}
                                          onChange={(e) => handleAttributeChange(rawK, e.target.value)}
                                          className="h-8 text-[12px] rounded-lg border-slate-200"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* 2. Optional / Product Specifications Section */}
                            {bolPreviewData?.optional_attributes?.length > 0 && (
                              <div className="pt-2">
                                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                    Additional Category Specifications (Optional)
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {bolPreviewData.optional_attributes.map((attr) => (
                                    <div key={attr.id} className="p-2.5 bg-gray-50/50 border border-slate-200/70 rounded">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase block truncate" title={attr.id}>
                                        {attr.id}
                                      </span>
                                      <span className="text-[12px] font-medium text-gray-700 block truncate mt-0.5" title={String(attr.value)}>
                                        {String(attr.value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* 2. Live Bol.com JSON Payload View */
                          <div className="p-4 bg-slate-950 text-slate-100 font-mono text-xs">
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPayloadType("content")}
                                  className={`px-3 py-1.5 rounded-lg transition-all text-xs font-semibold cursor-pointer ${
                                    payloadType === "content"
                                      ? "bg-gray-900 text-white"
                                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                  }`}
                                >
                                  POST /retailer/content/products
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPayloadType("offer")}
                                  className={`px-3 py-1.5 rounded-lg transition-all text-xs font-semibold cursor-pointer ${
                                    payloadType === "offer"
                                      ? "bg-gray-900 text-white"
                                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                  }`}
                                >
                                  POST /retailer/offers
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const payloadStr = JSON.stringify(
                                    payloadType === "content"
                                      ? liveContentPayload
                                      : liveOfferPayload,
                                    null,
                                    2
                                  );
                                  navigator.clipboard.writeText(payloadStr);
                                  toast.success("Payload copied to clipboard!");
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                              >
                                📋 Copy JSON
                              </button>
                            </div>

                            <pre className="p-3.5 bg-slate-900 rounded overflow-x-auto text-[11px] text-emerald-400 max-h-96 thin-scrollbar border border-slate-800/80">
                              {JSON.stringify(
                                payloadType === "content"
                                  ? (liveContentPayload || { status: "Generating content payload..." })
                                  : (liveOfferPayload || { status: "Generating offer payload..." }),
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                },
                {
                  key: '3',
                  label: (
                    <div className="flex items-center gap-2">
                      <span>Media Gallery</span>
                      {!isBulkMode && (
                        hasUntranslatedImages ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-amber-700 border border-amber-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            {untranslatedCount > 0 ? `${untranslatedCount} Untranslated` : "Select Image"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 border border-gray-200 flex items-center gap-1">
                            <span>✓</span>
                            <span>{selectedCount}/{selectedCount}</span>
                          </span>
                        )
                      )}
                    </div>
                  ),
                  children: (
                    <div className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <span className="text-[13px] text-gray-500 font-medium">Select images or upload custom images to include in the Bol.com listing.</span>
                        <button
                          type="button"
                          onClick={handleTranslateAllImages}
                          disabled={translatingAll || !form.photos?.length}
                          className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-700 text-white rounded text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                          title="Translate all Dutch text in product pictures using AI"
                        >
                          {translatingAll ? (
                            <>
                              <Spin size="small" className="text-white" />
                              <span>Translating All Pictures...</span>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                              </svg>
                              <span>Translate All Pictures</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {/* Upload custom image dropzone card */}
                        <label className="relative aspect-square bg-gray-50 border border-dashed border-gray-300 hover:border-gray-400 rounded flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-gray-50 transition-all duration-200 group shadow-sm">
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
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-gray-400 transition-transform mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            </div>
                          )}
                          <span className="text-[12px] font-semibold text-gray-700">Upload Image</span>
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5">JPG / PNG</span>
                        </label>

                        {form.photos?.length > 0 && form.photos.map((src, i) => (
                          <div 
                            key={i} 
                            className={`relative aspect-square bg-white border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center p-2 group ${selectedPhotos.includes(i) ? 'border-brand ring-2 ring-brand/10' : 'border-gray-200 hover:border-slate-300'}`}
                          >
                             {translatingIndex === i || revertingIndex === i ? (
                               <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                                 <Spin size="small" />
                                 <span className="text-[11px] text-gray-500 font-medium mt-2">
                                   {revertingIndex === i ? "Reverting..." : "Translating..."}
                                 </span>
                               </div>
                             ) : null}
                             <Image src={src} alt={`Product ${i+1}`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                             
                             <div className={`absolute inset-0 transition-all duration-200 pointer-events-none ${selectedPhotos.includes(i) ? 'bg-transparent' : 'bg-slate-900/20 group-hover:bg-slate-900/10'}`}></div>
                             
                             {isPhotoTranslated(i, src) ? (
                                <>
                                  <div className="absolute top-2.5 left-2.5 z-10">
                                    <span className={`px-2.5 py-0.5 backdrop-blur-md text-white rounded text-[10px] font-bold tracking-wide shadow-sm flex items-center gap-1 border ${(src?.includes("translated-images") || (originalPhotos[i] && originalPhotos[i] !== src)) ? 'bg-gray-900/85 border-white/20' : customUploadedUrls.has(src) ? 'bg-gray-700/85 border-white/20' : 'bg-gray-500/85 border-white/20'}`}>
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                      {(src?.includes("translated-images") || (originalPhotos[i] && originalPhotos[i] !== src)) ? "Translated" : customUploadedUrls.has(src) ? "Custom Upload" : "Clean (No Text)"}
                                    </span>
                                  </div>
                                  
                                  {(src?.includes("translated-images") || (originalPhotos[i] && originalPhotos[i] !== src)) && (
                                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                                      <button
                                        type="button"
                                        title="Undo translation & revert to original photo"
                                        onClick={(e) => handleRevertImage(i, e)}
                                        className="px-2.5 py-1 bg-slate-900/85 hover:bg-rose-600 text-white backdrop-blur-md border border-white/20 rounded text-[10px] font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                        </svg>
                                        Undo Translation
                                      </button>
                                    </div>
                                  )}
                                </>
                             ) : (
                               <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                                 <button 
                                   type="button"
                                   title="Translate Image"
                                   onClick={(e) => handleTranslateImage(i, e)}
                                   className="px-2.5 py-1 bg-white/95 hover:bg-gray-900 hover:text-white backdrop-blur-md border border-gray-200 rounded text-[10px] font-semibold text-gray-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-5 border-t border-gray-100">
              {/* Left side: Dynamic translation / validation status banner */}
              <div className="flex items-center gap-2">
                {!isBulkMode && hasUntranslatedImages ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-800 text-xs font-semibold">
                    <span>⚠️</span>
                    <span>
                      {selectedCount === 0
                        ? "Select at least 1 image to publish."
                        : `${untranslatedCount} selected image${untranslatedCount === 1 ? '' : 's'} untranslated.`}
                    </span>
                    {untranslatedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleTranslateAllImages}
                        disabled={translatingAll}
                        className="ml-1 px-2 py-0.5 bg-gray-900 text-white rounded font-semibold hover:bg-gray-700 cursor-pointer disabled:opacity-50"
                      >
                        {translatingAll ? "Translating..." : "Translate All"}
                      </button>
                    )}
                  </div>
                ) : !isBulkMode && !isValidEan ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    <span>⚠️</span>
                    <span>Valid 13-digit EAN required.</span>
                  </div>
                ) : !isBulkMode ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold">
                    <span>✓</span>
                    <span>All {selectedCount} images ready & translated</span>
                  </div>
                ) : null}
              </div>

              {/* Right side: Action buttons */}
              <div className="flex items-center justify-end gap-3 shrink-0">
                <Button onClick={onClose} className="h-10 px-5 rounded-lg font-medium border-gray-200 text-gray-600 cursor-pointer">
                  Cancel
                </Button>
                <Button
                  type="primary"
                  onClick={handlePublish}
                  loading={publishing || updating}
                  disabled={isPublishDisabled}
                  className="h-10 px-6 rounded-lg font-semibold bg-gray-900 text-white disabled:!bg-gray-200 disabled:!text-gray-400 disabled:!border-gray-200 disabled:!cursor-not-allowed cursor-pointer transition-all"
                  title={
                    hasUntranslatedImages && !isBulkMode
                      ? "All product images must be translated to Dutch before publishing."
                      : (!isValidEan && !isBulkMode ? "A valid 13-digit EAN is required." : "")
                  }
                >
                  {isBulkMode ? "Save Draft" : (scheduleEnabled ? "Schedule Publish" : "Publish to Bol.com")}
                </Button>
              </div>
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
           color: #111827 !important;
        }
        .custom-tabs .ant-tabs-ink-bar {
           background: #111827;
           height: 2px !important;
           border-radius: 3px 3px 0 0;
        }
      `}} />
    </Modal>
  );
};

export default DraftEditModal;
