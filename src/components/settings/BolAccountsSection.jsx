import { useState, useEffect } from "react";
import { InputNumber } from "antd";
import toast from "react-hot-toast";
import BolAccountForm from "./BolAccountForm";
import { useUpdateBolMultiplierMutation } from "../../Redux/connectionApis";

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
}) => (
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
            accounts.map((cred) => (
              <div key={cred.account_id} className="rounded border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">
                        {cred.account_name}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 flex-shrink-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cred.is_secret_set ? "bg-green-500" : "bg-amber-400"
                          }`}
                        />
                        {cred.is_secret_set ? "Active" : "Incomplete"}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                      {cred.client_id || "—"}
                    </p>

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
            ))
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

export default BolAccountsSection;
