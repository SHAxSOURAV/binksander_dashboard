import { useState, useEffect } from "react";
import { Modal, Select, DatePicker, Button, Spin } from "antd";
import toast from "react-hot-toast";
import {
  useGetBolCredentialsQuery,
} from "../../Redux/connectionApis";
import { useUI } from "../../Provider/ContextProvider";
import { useCreateDraftFromAmazonMutation } from "../../Redux/productApis";
import { url as API_URL } from "../../Redux/main/server";
import { getToken } from "../../utils/session";
import DraftEditModal from "./DraftEditModal";

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
  
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(true);
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
      
      const generated = [];
      for (const p of products) {
        if (p.scrapePending || !p.title) continue;
        
        try {
          const payload = {
            asin: p.asin,
            country: p.country,
            title: p.spreadsheetTitle || p.title,
            ean: p.ean,
            estimated_price: parseFloat(p.price) || 0,
            status: "draft",
            photos: []
          };
          const result = await generateDraft(payload).unwrap();
          if (result.success && result.data?.id) {
             generated.push({
               id: p.id,
               asin: p.asin,
               ean: p.spreadsheetEan || p.ean,
               supplierUrl: p.supplier_link || p.supplierUrl || `https://www.amazon.nl/dp/${p.asin}`,
               image: p.image,
               draftId: result.data.id,
               draftPrice: result.data.bol_price || result.data.estimated_price || p.price,
               draftTitle: result.data.title || payload.title
             });
          }
        } catch (e) {
          console.error("Failed to generate draft for", p.asin, e);
        }
      }
      
      setDrafts(generated);
      setIsGeneratingDrafts(false);
    };

    if (products.length > 0 && !hasGenerated) {
      createDrafts();
    }
  }, [products, generateDraft, hasGenerated]);

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
      const draftIds = drafts.map(d => d.draftId);
      if (draftIds.length === 0) {
        toast.error("No valid products to publish.");
        setIsPublishing(false);
        return;
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
    <>
      <Modal
        title={<h2 className="text-xl font-bold tracking-tight text-gray-800">{products.length === 1 ? "Publish Product" : `Bulk Publish Products (${products.length})`}</h2>}
        open={true}
        onCancel={onClose}
        footer={null}
        width={650}
        destroyOnClose
        style={{ display: editingDraftId ? 'none' : 'block' }}
      >
        {isGeneratingDrafts ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-500 font-medium">Generating Drafts... ({drafts.length}/{products.length})</p>
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
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Drafts Ready to Publish</label>
            <div className="flex flex-col gap-0 max-h-60 overflow-y-auto pr-1 border border-gray-100 rounded-lg">
              {drafts.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No valid products to publish.</div>
              ) : (
                drafts.map(d => (
                  <div key={d.draftId} className="flex items-center justify-between gap-4 p-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      {d.image ? (
                        <img src={d.image || "https://via.placeholder.com/40"} alt="" className="w-10 h-10 object-contain rounded bg-white border border-gray-100 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 text-xs text-gray-400">No Img</div>
                      )}
                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-700 truncate w-full" title={d.draftTitle}>
                          {d.draftTitle}
                        </span>
                        
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 font-medium">
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
                          {d.ean && (
                            <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                              EAN: {d.ean}
                              <button 
                                onClick={() => { navigator.clipboard.writeText(d.ean); toast.success("EAN Copied") }}
                                className="text-gray-400 hover:text-gray-700 ml-0.5"
                                title="Copy EAN"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" /><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" /></svg>
                              </button>
                            </span>
                          )}

                          {/* Price Block */}
                          <span className="ml-1 text-gray-700 font-bold text-xs">€{d.draftPrice}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="small" onClick={() => setEditingDraftId(d.draftId)} className="text-brand border-brand">
                      Edit
                    </Button>
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
                  onChange={(v) => handleChange("schedule_at", v?.toDate() || null)}
                />
              </Field>
            )}
          </div>
        </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
          <Button onClick={onClose} disabled={isPublishing || isGeneratingDrafts}>
            Cancel
          </Button>
          <Button 
            type="primary" 
            onClick={handleBulkPublish}
            loading={isPublishing}
            disabled={isGeneratingDrafts || drafts.length === 0}
            className="bg-black hover:bg-gray-800 disabled:bg-gray-300"
          >
            {scheduleEnabled ? "Schedule Bulk Publish" : "Publish All"}
          </Button>
        </div>
      </Modal>

      {editingDraftId && (
        <DraftEditModal
          draftId={editingDraftId}
          onClose={() => setEditingDraftId(null)}
          isBulkMode={true}
        />
      )}
    </>
  );
};

export default BulkPublishModal;
