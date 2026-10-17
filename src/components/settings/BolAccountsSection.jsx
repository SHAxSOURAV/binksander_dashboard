import { useState, useEffect } from "react";
import { InputNumber } from "antd";
import toast from "react-hot-toast";
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiShoppingBag,
  FiPlay,
  FiEdit2,
  FiTrash2,
  FiKey,
  FiCopy,
  FiBriefcase,
  FiPlus,
} from "react-icons/fi";
import BolAccountForm from "./BolAccountForm";
import { useUpdateBolMultiplierMutation, useTestBolAccountMutation } from "../../Redux/connectionApis";

/**
 * The list of connected Bol.com API accounts, plus the add/edit form.
 *
 * Split out of SettingsModal along with BolAccountForm - between them they were about a
 * quarter of a file that had grown past a thousand lines.
 */

const MultiplierQuickEdit = ({ accountId, value }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [updateMultiplier, { isLoading }] = useUpdateBolMultiplierMutation();

  // Follow the server value whenever it changes underneath us (refetch, other edit).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = async () => {
    const next = Number(draft);
    if (!Number.isFinite(next) || next <= 0 || next > 100) {
      toast.error("Multiplier must be between 0.1 and 100");
      setDraft(value);
      setEditing(false);
      return;
    }
    if (next === Number(value)) {
      setEditing(false);
      return;
    }
    try {
      await updateMultiplier({ accountId, price_multiplier: next }).unwrap();
      toast.success(`Multiplier set to ×${next}`);
      setEditing(false);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update multiplier");
      setDraft(value);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        type="button"
        title="Click to edit price multiplier"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200/80 hover:border-gray-300 text-[11px] font-medium text-gray-700 transition-colors tabular-nums cursor-pointer"
      >
        <span>×{value}</span>
        <FiEdit2 size={9} className="text-gray-400" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <InputNumber
        autoFocus
        size="small"
        value={draft}
        onChange={setDraft}
        onPressEnter={commit}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        disabled={isLoading}
        step={0.1}
        min={0.1}
        max={100}
        controls={false}
        prefix="×"
        className="w-[65px] text-xs"
      />
    </span>
  );
};

const BolAccountsSection = ({
  accounts = [],
  form,
  editOpen,
  setEditOpen,
  onSave,
  onDelete,
  saving = false,
  deleting = false,
}) => {
  const [testAccount] = useTestBolAccountMutation();
  const [testingId, setTestingId] = useState(null);

  const handleTest = async (accountId, accountName) => {
    setTestingId(accountId);
    try {
      await testAccount(accountId).unwrap();
      toast.success(`${accountName}: Connection verified! API keys are active.`);
    } catch (err) {
      const errMsg = err?.data?.detail || "Bol.com Authentication Failed. Check API keys.";
      toast.error(`${accountName}: ${errMsg}`);
    } finally {
      setTestingId(null);
    }
  };

  const populateEditForm = (cred) => {
    form.setFieldsValue({
      account_id: cred.account_id,
      account_name: cred.account_name,
      client_id: cred.client_id,
      manufacturer_name: cred.manufacturer_name,
      manufacturer_email: cred.manufacturer_email,
      manufacturer_address: cred.manufacturer_address,
      economic_operator_id: cred.economic_operator_id,
      fulfilment_profile_id: cred.fulfilment_profile_id,
      price_multiplier: cred.price_multiplier ?? 2.5,
    });
    setEditOpen(true);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Bol.com API Accounts
        </p>
        {!editOpen && (
          <button
            type="button"
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ price_multiplier: 2.5 });
              setEditOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-[4px] shadow-2xs transition-colors cursor-pointer"
          >
            <FiPlus size={12} className="text-gray-500" />
            Add account
          </button>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {accounts.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-gray-200 px-4 py-7 text-center bg-gray-50/40">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100 mx-auto flex items-center justify-center mb-2">
              <FiShoppingBag size={17} />
            </div>
            <p className="text-xs font-medium text-gray-700">No Bol.com accounts connected</p>
            <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs mx-auto">
              Connect your Bol.com seller API credentials to sync orders, offers, and inventory.
            </p>
            {!editOpen && (
              <button
                type="button"
                onClick={() => {
                  form.resetFields();
                  form.setFieldsValue({ price_multiplier: 2.5 });
                  setEditOpen(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-[4px] shadow-xs transition-colors cursor-pointer"
              >
                <FiPlus size={13} />
                Connect Bol Account
              </button>
            )}
          </div>
        ) : (
          accounts.map((cred) => {
            const isAuthFailed = Boolean(cred.last_auth_error || cred.status === "AUTH_FAILED");
            const isMissingManufacturer = !(
              cred.manufacturer_name &&
              cred.manufacturer_address &&
              cred.manufacturer_email
            );

            return (
              <div
                key={cred.account_id}
                className={`rounded-[4px] border bg-white p-3.5 transition-all shadow-xs ${
                  isAuthFailed
                    ? "border-gray-200 border-l-[3px] border-l-rose-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Icon + Main Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className={`w-8 h-8 rounded-[4px] flex items-center justify-center flex-shrink-0 border ${
                        isAuthFailed
                          ? "bg-rose-50 text-rose-600 border-rose-200"
                          : "bg-blue-50 text-blue-600 border-blue-100"
                      }`}
                    >
                      <FiShoppingBag size={16} />
                    </span>

                    <div className="min-w-0 flex-1">
                      {/* Name & Status */}
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">
                          {cred.account_name}
                        </p>

                        {isAuthFailed ? (
                          <span
                            title={cred.last_auth_error || "Bol.com Authentication Failed"}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 flex-shrink-0"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Auth Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                cred.is_secret_set ? "bg-emerald-500" : "bg-amber-400"
                              }`}
                            />
                            {cred.is_secret_set ? "Active" : "Incomplete"}
                          </span>
                        )}
                      </div>

                      {/* Meta Tags: Client ID, Multiplier */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
                        {/* Client ID */}
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-gray-50 border border-gray-200/80 font-mono text-[11px] text-gray-600"
                          title={`Client ID: ${cred.client_id || "—"}`}
                        >
                          <FiKey size={10} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[210px]">
                            {cred.client_id || "—"}
                          </span>
                          {cred.client_id && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(cred.client_id);
                                toast.success("Client ID copied!");
                              }}
                              className="text-gray-400 hover:text-gray-700 ml-0.5 cursor-pointer transition-colors"
                              title="Copy Client ID"
                            >
                              <FiCopy size={10} />
                            </button>
                          )}
                        </div>

                        {/* Price Multiplier */}
                        <div className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                          <span className="text-gray-400">Markup:</span>
                          <MultiplierQuickEdit
                            accountId={cred.account_id}
                            value={cred.price_multiplier ?? 2.5}
                          />
                        </div>
                      </div>

                      {/* Manufacturer */}
                      {(cred.manufacturer_name || cred.manufacturer_email) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1.5 truncate">
                          <FiBriefcase size={11} className="text-gray-400 flex-shrink-0" />
                          <span
                            className="truncate max-w-[340px]"
                            title={[cred.manufacturer_name, cred.manufacturer_email]
                              .filter(Boolean)
                              .join(" · ")}
                          >
                            {[cred.manufacturer_name, cred.manufacturer_email]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTest(cred.account_id, cred.account_name)}
                      disabled={testingId === cred.account_id}
                      title="Test live API connection to Bol.com"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-2 py-1 rounded-[4px] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {testingId === cred.account_id ? (
                        <>
                          <FiLoader className="animate-spin text-gray-500" size={11} />
                          <span>Testing</span>
                        </>
                      ) : (
                        <>
                          <FiPlay size={10} className="text-gray-500" />
                          <span>Test</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => populateEditForm(cred)}
                      title="Edit Account"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-2 py-1 rounded-[4px] transition-colors cursor-pointer"
                    >
                      <FiEdit2 size={10} className="text-gray-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(cred.account_id)}
                      disabled={deleting}
                      title="Delete Account"
                      className="inline-flex items-center justify-center text-[11px] font-medium text-gray-400 hover:text-rose-600 bg-white border border-gray-200 hover:border-rose-200 hover:bg-rose-50/60 p-1.5 rounded-[4px] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Error Banner when auth fails */}
                {isAuthFailed && (
                  <div className="mt-3 rounded-[4px] bg-rose-50/70 border border-rose-200/80 px-3 py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FiAlertCircle className="text-rose-600 flex-shrink-0" size={14} />
                      <div className="text-[11px] leading-tight min-w-0">
                        <span className="font-semibold text-rose-900">Auth Error: </span>
                        <span className="text-rose-700 font-normal">
                          {cred.last_auth_error || "Invalid Client ID or Client Secret (401 invalid_client)."}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => populateEditForm(cred)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-100/70 hover:bg-rose-100 px-2 py-0.5 rounded-[3px] transition-colors cursor-pointer flex-shrink-0"
                    >
                      <FiEdit2 size={10} />
                      Update Keys
                    </button>
                  </div>
                )}

                {/* Missing manufacturer details banner */}
                {isMissingManufacturer && !isAuthFailed && (
                  <div className="mt-2.5 rounded-[4px] bg-amber-50/80 border border-amber-200/80 px-3 py-2 flex items-center justify-between gap-2 text-[11px] text-amber-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <FiAlertTriangle className="text-amber-600 flex-shrink-0" size={13} />
                      <span className="truncate">
                        Manufacturer details missing — publishing to Bol.com is blocked until added.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => populateEditForm(cred)}
                      className="text-amber-800 font-semibold underline hover:text-amber-900 text-[11px] flex-shrink-0 cursor-pointer"
                    >
                      Add details
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {editOpen && (
        <BolAccountForm
          form={form}
          onFinish={onSave}
          saving={saving}
          onCancel={() => {
            setEditOpen(false);
            form.resetFields();
          }}
        />
      )}
  </>
  );
};

export default BolAccountsSection;
