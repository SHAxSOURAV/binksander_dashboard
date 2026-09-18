import { useState, useEffect } from "react";
import { InputNumber } from "antd";
import toast from "react-hot-toast";
import { FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiLoader } from "react-icons/fi";
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
        title="Click to change the price multiplier"
        className="text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-2.5 py-1 rounded transition-colors tabular-nums"
      >
        ×{value}
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
        className="w-[70px]"
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

  return (
  <>
      {/* Bol.com credentials */}
      <div className="flex items-center justify-between mb-2 pt-4 border-t border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Bol.com API Accounts
        </p>
        {!editOpen && (
          <button
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ price_multiplier: 2.5 });
              setEditOpen(true);
            }}
            className="text-[11px] font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-2.5 py-1 rounded transition-colors"
          >
            Add account
          </button>
        )}
      </div>

      <div className="space-y-2 mb-4">
          {accounts.length === 0 ? (
            <div className="rounded border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
              No Bol accounts connected.
            </div>
          ) : (
          accounts.map((cred) => {
            const isAuthFailed = Boolean(cred.last_auth_error || cred.status === "AUTH_FAILED");
            return (
              <div
                key={cred.account_id}
                className={`rounded border p-3 transition-colors ${
                  isAuthFailed
                    ? "border-red-300 bg-red-50/20"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isAuthFailed && (
                        <FiAlertTriangle
                          size={15}
                          className="text-red-500 flex-shrink-0"
                          title="Bol.com Authentication Failed"
                        />
                      )}
                      <p className={`text-[13px] font-semibold truncate ${isAuthFailed ? "text-red-900 font-bold" : "text-gray-900"}`}>
                        {cred.account_name}
                      </p>
                      {isAuthFailed ? (
                        <span
                          title={cred.last_auth_error || "Bol.com Authentication Failed"}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 flex-shrink-0"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Auth Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 flex-shrink-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cred.is_secret_set ? "bg-green-500" : "bg-amber-400"
                            }`}
                          />
                          {cred.is_secret_set ? "Active" : "Incomplete"}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                      {cred.client_id || "—"}
                    </p>

                    {isAuthFailed && (
                      <div className="text-[11px] text-red-800 bg-red-50 border border-red-200 rounded-[3px] px-2.5 py-1.5 mt-2 leading-snug flex items-center justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FiAlertCircle className="text-red-500 flex-shrink-0" size={13} />
                          <span className="truncate">
                            <strong>Bol.com Error:</strong> {cred.last_auth_error || "Invalid Client ID or Client Secret (401 invalid_client)."}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            form.setFieldsValue({
                              account_id: cred.account_id,
                              account_name: cred.account_name,
                              client_id: cred.client_id,
                              manufacturer_name: cred.manufacturer_name,
                              manufacturer_email: cred.manufacturer_email,
                              manufacturer_address: cred.manufacturer_address,
                              economic_operator_id: cred.economic_operator_id,
                              fulfilment_profile_id: cred.fulfilment_profile_id,
                              price_multiplier: cred.price_multiplier,
                            });
                            setEditOpen(true);
                          }}
                          className="text-[11px] font-semibold text-red-700 underline hover:text-red-900 flex-shrink-0 cursor-pointer"
                        >
                          Update Keys
                        </button>
                      </div>
                    )}

                    {(cred.manufacturer_name || cred.manufacturer_email) && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {[cred.manufacturer_name, cred.manufacturer_email]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    {/* Bol rejects listings without these, so an account missing
                        them cannot publish at all. Say so here rather than letting
                        it surface as a failed publish later. */}
                    {!(
                      cred.manufacturer_name &&
                      cred.manufacturer_address &&
                      cred.manufacturer_email
                    ) && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[3px] px-1.5 py-1 mt-1.5 leading-snug">
                        Manufacturer details missing — publishing is blocked for
                        this account. Add them via Edit.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTest(cred.account_id, cred.account_name)}
                      disabled={testingId === cred.account_id}
                      title="Test live API connection to Bol.com"
                      className="text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-2 py-1 rounded transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {testingId === cred.account_id ? (
                        <>
                          <FiLoader className="animate-spin text-gray-500" size={11} />
                          <span>Testing</span>
                        </>
                      ) : (
                        "Test"
                      )}
                    </button>
                    <MultiplierQuickEdit
                      accountId={cred.account_id}
                      value={cred.price_multiplier ?? 2.5}
                    />
                    <button
                      onClick={() => {
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
                      }}
                      className="text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-2.5 py-1 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(cred.account_id)}
                      disabled={deleting}
                      className="text-[11px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 px-2.5 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          }))}
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
