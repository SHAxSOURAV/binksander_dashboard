import { useState, useEffect } from "react";
import { Modal, Input, Select, Button, Spin, InputNumber, Tabs } from "antd";
import toast from "react-hot-toast";
import {
  useGetDraftQuery,
  useUpdateDraftMutation,
  usePublishDraftMutation,
} from "../../Redux/productApis";
import { useGetBolCredentialsQuery } from "../../Redux/connectionApis";
import { useUI } from "../../Provider/ContextProvider";

const { TextArea } = Input;

const Field = ({ label, children, required }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const DraftEditModal = ({ draftId, onClose }) => {
  const { setSettingsOpen, setSettingsTab } = useUI();

  const { data: draftRes, isFetching: loadingDraft } = useGetDraftQuery(draftId, {
    skip: !draftId,
  });
  const draft = draftRes?.data;

  const { data: bolCreds } = useGetBolCredentialsQuery();

  const [updateDraft, { isLoading: updating }] = useUpdateDraftMutation();
  const [publishDraft, { isLoading: publishing }] = usePublishDraftMutation();

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
    photos: []
  });

  useEffect(() => {
    if (draft) {
      setForm({
        title: draft.title || "",
        ean: draft.ean || "",
        bol_price: draft.bol_price || draft.estimated_price || "",
        stock_amount: draft.stock_amount ?? 10,
        condition: draft.condition || "NEW",
        delivery_code: draft.delivery_code || "24uurs-23",
        reference: draft.reference || draft.asin || "",
        description: draft.description || "",
        attributes: draft.attributes || {},
        photos: draft.photos || [],
      });
    }
  }, [draft]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateDraft({
        id: draftId,
        ...form,
      }).unwrap();
      toast.success("Draft updated successfully");
      return true;
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update draft");
      return false;
    }
  };

  const handlePublish = async () => {
    // 1. Check if Bol credentials exist
    const hasCreds = bolCreds?.client_id && bolCreds?.is_secret_set;
    if (!hasCreds) {
      toast.error("You must connect your Bol.com credentials first! Opening settings...");
      onClose();
      setSettingsTab("connection");
      setSettingsOpen(true);
      return;
    }

    // 2. Save the current form data first
    const saved = await handleSave();
    if (!saved) return;

    // 3. Publish
    try {
      await publishDraft(draftId).unwrap();
      toast.success("Draft published to Bol.com successfully!");
      onClose();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to publish to Bol.com");
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
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-3 mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Final Review & Publish</h2>
            <p className="text-[13px] font-medium text-gray-500 mt-0.5">
              Review the complete product data payload that will be submitted to Bol.com.
            </p>
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <Field label="EAN Number" required>
                          <Input
                            value={form.ean}
                            onChange={(e) => handleChange("ean", e.target.value)}
                            className="rounded-lg h-10 text-[14px] text-gray-800"
                          />
                        </Field>
                        <Field label="Internal Reference (ASIN)">
                          <Input
                            value={form.reference}
                            onChange={(e) => handleChange("reference", e.target.value)}
                            className="rounded-lg h-10 text-[14px] text-gray-600 bg-gray-50 border-gray-200"
                            placeholder="Optional internal code"
                          />
                        </Field>

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
                              { label: "24uurs-23", value: "24uurs-23" },
                              { label: "24uurs-22", value: "24uurs-22" },
                              { label: "24uurs-21", value: "24uurs-21" },
                              { label: "1-2d", value: "1-2d" },
                              { label: "2-3d", value: "2-3d" },
                              { label: "3-5d", value: "3-5d" },
                              { label: "4-8d", value: "4-8d" },
                              { label: "1-8d", value: "1-8d" },
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
                              {Object.entries(form.attributes).map(([k, v]) => (
                                <div key={k} className="flex flex-col border-b border-gray-200 pb-2">
                                   <span className="text-[11px] font-bold text-gray-400 uppercase">{k}</span>
                                   <span className="text-[13px] font-semibold text-gray-800">{v}</span>
                                </div>
                              ))}
                            </div>
                         ) : (
                            <p className="text-sm text-gray-400 font-medium">No technical specifications provided by Amazon.</p>
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
                      {form.photos?.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {form.photos.map((src, i) => (
                            <div key={i} className="aspect-square bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center p-2">
                               <img src={src} alt={`Product ${i+1}`} className="w-full h-full object-contain" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 font-semibold">
                           No photos available
                        </div>
                      )}
                    </div>
                  )
                }
              ]}
            />

            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
              <Button onClick={onClose} className="h-10 px-5 rounded-lg font-medium border-gray-200 text-gray-600">
                Cancel
              </Button>
              <Button onClick={handleSave} loading={updating} className="h-10 px-5 rounded-lg font-medium border-brand text-brand hover:bg-brand/5">
                Save Draft
              </Button>
              <Button
                type="primary"
                onClick={handlePublish}
                loading={publishing || updating}
                className="h-10 px-6 rounded-lg font-semibold bg-brand shadow-sm hover:opacity-90 transition-opacity"
              >
                Publish to Bol.com
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
