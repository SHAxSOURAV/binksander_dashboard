import { useState } from "react";
import { Form, Input, Tooltip } from "antd";
import toast from "react-hot-toast";
import { FiCheckCircle, FiTrash2, FiEdit2, FiPlus, FiServer } from "react-icons/fi";
import {
  useGetRimcoCredentialsQuery,
  useSaveRimcoCredentialsMutation,
  useDeleteRimcoCredentialsMutation,
  useVerifyRimcoCredentialsMutation,
} from "../../Redux/rimcoApis";

const FIELD = "h-9 rounded-[3px]";
const MONO = `${FIELD} font-mono text-xs`;

const RimcoAccountsSection = () => {
  const { data: accounts = [], isLoading } = useGetRimcoCredentialsQuery();
  const [saveCreds, { isLoading: saving }] = useSaveRimcoCredentialsMutation();
  const [deleteCreds, { isLoading: deleting }] = useDeleteRimcoCredentialsMutation();
  const [verifyCreds, { isLoading: verifying }] = useVerifyRimcoCredentialsMutation();

  const [form] = Form.useForm();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleOpenAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      base_url: "https://rimcofulfilment.lyrawms.nl/api/v1",
    });
    setEditingId(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (acc) => {
    form.resetFields();
    form.setFieldsValue({
      account_id: acc.account_id,
      account_name: acc.account_name,
      base_url: acc.base_url || "https://rimcofulfilment.lyrawms.nl/api/v1",
      api_token: "",
    });
    setEditingId(acc.account_id);
    setFormOpen(true);
  };

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields(["api_token", "base_url"]);
      if (!values.api_token) {
        toast.error("Please enter an API Token to test.");
        return;
      }
      await verifyCreds({
        api_token: values.api_token,
        base_url: values.base_url,
      }).unwrap();
      toast.success("Connection to Rimco Lyra WMS succeeded!");
    } catch (err) {
      toast.error(err?.data?.detail || err?.message || "Connection failed. Check token and URL.");
    }
  };

  const handleFinish = async (values) => {
    try {
      await saveCreds({
        account_id: editingId || undefined,
        account_name: values.account_name,
        api_token: values.api_token,
        base_url: values.base_url,
      }).unwrap();

      toast.success(editingId ? "Rimco account updated!" : "Rimco account connected successfully!");
      setFormOpen(false);
      form.resetFields();
      setEditingId(null);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to save Rimco account.");
    }
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm("Are you sure you want to disconnect this Rimco account?")) return;
    try {
      await deleteCreds(accountId).unwrap();
      toast.success("Rimco account removed.");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to remove Rimco account.");
    }
  };

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-2 pt-4 border-t border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Rimco Logistics API Accounts
        </p>
        {!formOpen && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="text-[11px] font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
          >
            <FiPlus size={12} /> Add Rimco account
          </button>
        )}
      </div>

      {/* Accounts List */}
      <div className="space-y-2 mb-4">
        {isLoading ? (
          <div className="rounded border border-dashed border-gray-200 px-4 py-4 text-center text-xs text-gray-400">
            Loading Rimco accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
            No Rimco Logistics accounts connected yet. Add one to view live warehouse orders &amp; inventory.
          </div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.account_id}
              className="rounded border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">
                      {acc.account_name}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 flex-shrink-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          acc.is_valid ? "bg-green-500" : "bg-amber-400"
                        }`}
                      />
                      {acc.is_valid ? "Connected" : "Pending"}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 font-mono truncate mt-0.5 flex items-center gap-1.5">
                    <FiServer size={11} className="text-gray-400 shrink-0" />
                    <span>{acc.base_url}</span>
                  </p>

                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    Token: {acc.masked_token}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(acc)}
                    className="text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                  >
                    <FiEdit2 size={11} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(acc.account_id)}
                    disabled={deleting}
                    className="text-[11px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 px-2.5 py-1 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <FiTrash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Form */}
      {formOpen && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          className="rounded-[3px] border border-gray-200 bg-white p-4 mb-4"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
            <span className="text-xs font-bold text-gray-800">
              {editingId ? "Edit Rimco Logistics Account" : "Connect New Rimco Logistics Account"}
            </span>
            <span className="text-[10px] text-gray-400">Lyra WMS Bearer Auth</span>
          </div>

          <Form.Item name="account_id" hidden>
            <Input />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item
              name="account_name"
              label="Account Name"
              rules={[{ required: true, message: "Please provide a name for this account" }]}
              className="mb-2"
            >
              <Input className={FIELD} placeholder="e.g. Obdam Main Warehouse" />
            </Form.Item>

            <Form.Item
              name="base_url"
              label="Tenant API URL"
              rules={[{ required: true, message: "API Base URL is required" }]}
              className="mb-2"
              tooltip="Default is https://rimcofulfilment.lyrawms.nl/api/v1. Replace tenant if using a custom Lyra WMS instance."
            >
              <Input className={MONO} placeholder="https://rimcofulfilment.lyrawms.nl/api/v1" />
            </Form.Item>
          </div>

          <Form.Item
            name="api_token"
            label="Lyra WMS API Bearer Token"
            rules={[{ required: true, message: "Please provide your Lyra WMS API Token" }]}
            className="mb-3"
            tooltip="Generate this token in your Rimco / Lyra WMS dashboard settings page."
          >
            <Input.Password className={MONO} placeholder="Enter your Rimco Bearer Token" />
          </Form.Item>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={verifying}
              className="h-8 px-3 rounded-[3px] border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <FiCheckCircle size={13} className="text-emerald-500" />
              {verifying ? "Testing..." : "Test Connection"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  form.resetFields();
                  setEditingId(null);
                }}
                className="h-8 px-3 rounded-[3px] border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-8 px-4 rounded-[3px] bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving..." : "Save Account"}
              </button>
            </div>
          </div>
        </Form>
      )}
    </>
  );
};

export default RimcoAccountsSection;
