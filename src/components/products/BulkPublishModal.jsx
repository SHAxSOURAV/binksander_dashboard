import { useState, useEffect } from "react";
import { Modal, Select, DatePicker, Button, Spin } from "antd";
import toast from "react-hot-toast";
import {
  useGetBolCredentialsQuery,
} from "../../Redux/connectionApis";
import { useUI } from "../../Provider/ContextProvider";
import { useCreateDraftFromAmazonMutation } from "../../Redux/productApis";
import { url as API_URL } from "../../Redux/main/server";

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

  const [form, setForm] = useState({
    condition: "NEW",
    delivery_code: "24uurs-15",
    schedule_at: null,
  });
  
  const [productPrices, setProductPrices] = useState(() => {
    const initial = {};
    products.forEach(p => {
      initial[p.id] = p.price || "";
    });
    return initial;
  });

  const [productTitles, setProductTitles] = useState(() => {
    const initial = {};
    products.forEach(p => {
      initial[p.id] = p.spreadsheetTitle || p.title || "";
    });
    return initial;
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  useEffect(() => {
    if (activeBolAccountId && !selectedAccount) {
      setSelectedAccount(activeBolAccountId);
    }
  }, [activeBolAccountId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBulkPublish = async () => {
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
      // 1. Generate Drafts for all selected products
      const draftIds = [];
      for (const p of products) {
        if (p.scrapePending || !p.title) continue;
        
        const payload = {
          asin: p.asin,
          country: p.country,
          title: productTitles[p.id] || p.spreadsheetTitle || p.title,
          ean: p.ean,
          estimated_price: parseFloat(productPrices[p.id]) || p.price,
          status: "draft",
          photos: p.image ? [p.image] : []
        };
        const result = await generateDraft(payload).unwrap();
        if (result.success && result.data?.id) {
          draftIds.push(result.data.id);
        }
      }

      if (draftIds.length === 0) {
        toast.error("No valid products to publish (still syncing or missing data).");
        setIsPublishing(false);
        return;
      }

      // 2. Call Bulk Publish Endpoint
      const token = localStorage.getItem("bol_access_token") || localStorage.getItem("bol_access_token_v2") || localStorage.getItem("token") || "";
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
      console.error(err);
      toast.error(err?.data?.detail || err.message || "Failed to bulk publish");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Modal
      title={<h2 className="text-xl font-bold tracking-tight text-gray-800">{products.length === 1 ? "Publish Product" : `Bulk Publish Products (${products.length})`}</h2>}
      open={true}
      onCancel={onClose}
      footer={null}
      width={650}
      destroyOnClose
    >
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
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Selected Products & Pricing</label>
          <div className="flex flex-col gap-0 max-h-60 overflow-y-auto pr-1 border border-gray-100 rounded-lg">
            {products.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  {p.image ? (
                    <img src={p.image || "https://via.placeholder.com/40"} alt="" className="w-10 h-10 object-contain rounded bg-white border border-gray-100 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 text-xs text-gray-400">No Img</div>
                  )}
                  <div className="flex-1 flex flex-col min-w-0">
                    <input 
                      type="text" 
                      className="text-sm font-medium text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand focus:outline-none transition-colors px-1 py-0.5 truncate w-full"
                      value={productTitles[p.id] !== undefined ? productTitles[p.id] : (p.spreadsheetTitle || p.title)}
                      onChange={(e) => setProductTitles(prev => ({ ...prev, [p.id]: e.target.value }))}
                      title="Edit product title"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[13px] font-bold text-gray-400">€</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 h-8 px-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-brand transition-shadow text-right font-medium"
                    value={productPrices[p.id] || ""}
                    onChange={(e) => setProductPrices(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder={p.price || "0.00"}
                  />
                </div>
              </div>
            ))}
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
                onChange={(v) => handleChange("schedule_at", v?.toDate() || null)}
              />
            </Field>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
        <Button onClick={onClose} disabled={isPublishing}>
          Cancel
        </Button>
        <Button 
          type="primary" 
          onClick={handleBulkPublish}
          loading={isPublishing}
          className="bg-black hover:bg-gray-800"
        >
          {scheduleEnabled ? "Schedule Bulk Publish" : "Publish Now"}
        </Button>
      </div>
    </Modal>
  );
};

export default BulkPublishModal;
