import { useState } from "react";
import { Form, Input, InputNumber, Tooltip } from "antd";
import { FiInfo } from "react-icons/fi";

/**
 * Create / edit form for one Bol.com API account.
 *
 * Split out of SettingsModal because the two together ran past a thousand lines, and
 * because the GPSR block below is the part most likely to keep changing.
 *
 * The manufacturer fields are deliberately NOT hidden behind "Advanced". Bol's Data
 * Model v10 makes Manufacturer Name and Manufacturer Address mandatory in 4,243 of its
 * 5,096 product categories, so an account without them cannot publish at all — burying
 * them is what left three of four live accounts unable to list compliantly.
 */

const FIELD = "h-9 rounded-[3px]";
const MONO = `${FIELD} font-mono text-xs`;

// Mirrors calculate_selling_price() on the backend so a multiplier can be judged before saving.
const previewPrice = (amazon, multiplier) =>
  Math.max(39.95, Math.floor((amazon * multiplier) / 10) * 10 + 9.95).toFixed(2);

const SectionLabel = ({ children, hint }) => (
  <div className="flex items-center gap-1.5 mt-4 mb-2">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </span>
    {hint && (
      <Tooltip title={hint}>
        <span className="text-gray-300 hover:text-gray-500 transition-colors leading-none">
          <FiInfo size={12} />
        </span>
      </Tooltip>
    )}
  </div>
);

const BolAccountForm = ({ form, onFinish, onCancel, saving = false }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      requiredMark={false}
      className="rounded-[3px] border border-gray-200 bg-white p-4"
    >
      <Form.Item name="account_id" hidden>
        <Input />
      </Form.Item>

      <SectionLabel>API credentials</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Form.Item
          name="account_name"
          label="Account Name"
          rules={[{ required: true, message: "Required" }]}
          className="mb-2"
        >
          <Input className={FIELD} placeholder="e.g. Main Account" />
        </Form.Item>
        <Form.Item
          name="client_id"
          label="Client ID"
          rules={[{ required: true, message: "Required" }]}
          className="mb-2"
        >
          <Input className={MONO} placeholder="Bol.com Client ID" />
        </Form.Item>
      </div>
      <Form.Item
        name="client_secret"
        label="Client Secret"
        rules={[{ required: true, message: "Required" }]}
        className="mb-2"
      >
        <Input.Password className={MONO} placeholder="Bol.com Client Secret" />
      </Form.Item>

      <SectionLabel hint="Bol requires these on every listing under EU product safety rules (GPSR). They are stored per account, so each of your Bol accounts publishes under its own legal entity.">
        Manufacturer details (EU GPSR)
      </SectionLabel>
      <p className="text-[11px] text-gray-400 -mt-1 mb-3 leading-relaxed">
        Sent to Bol.com as{" "}
        <span className="font-medium text-gray-500">Fabrikant Naam</span>,{" "}
        <span className="font-medium text-gray-500">Fabrikant Adres</span> and{" "}
        <span className="font-medium text-gray-500">Elektronisch adres fabrikant</span> on
        every listing from this account. Required by most Bol categories — publishing is
        blocked without them.
      </p>
      <Form.Item
        name="manufacturer_name"
        label="Manufacturer / Company Name"
        rules={[{ required: true, message: "Required by Bol.com" }]}
        className="mb-2"
      >
        <Input className={FIELD} placeholder="e.g. Groupe SEB" />
      </Form.Item>
      <Form.Item
        name="manufacturer_address"
        label="Manufacturer Address"
        tooltip="A postal address consumers and market surveillance authorities can reach: street and number, postal code, city, country."
        rules={[{ required: true, message: "Required by Bol.com" }]}
        className="mb-2"
      >
        <Input
          className={`${FIELD} text-xs`}
          placeholder="e.g. 112 Chemin du Moulin Carron, 69130 Écully, Frankrijk"
        />
      </Form.Item>
      <Form.Item
        name="manufacturer_email"
        label="Manufacturer Email or Contact URL"
        tooltip="Bol calls this an 'electronic address', so either an email address or the URL of a contact page is accepted."
        rules={[{ required: true, message: "Required by Bol.com" }]}
        className="mb-2"
      >
        <Input
          className={`${FIELD} text-xs`}
          placeholder="e.g. support@example.nl or https://www.groupeseb.com"
        />
      </Form.Item>

      <SectionLabel>Pricing</SectionLabel>
      <Form.Item
        name="price_multiplier"
        label="Price Multiplier"
        tooltip="Markup applied to the Amazon purchase price for listings on this account. Each Bol account keeps its own value."
        rules={[
          { type: "number", min: 0.1, max: 100, message: "Must be between 0.1 and 100" },
        ]}
        className="mb-2"
      >
        <InputNumber
          className="h-9 w-full rounded-[3px]"
          step={0.1}
          min={0.1}
          max={100}
          precision={2}
          addonBefore="×"
          placeholder="2.5"
        />
      </Form.Item>
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const m = Number(getFieldValue("price_multiplier")) || 2.5;
          return (
            <p className="text-[11px] text-gray-400 -mt-1 mb-3">
              Selling price = Amazon price × {m}, rounded down to the nearest ×9.95, never
              below €39.95. e.g. €19.99 → €{previewPrice(19.99, m)} · €49.00 → €
              {previewPrice(49, m)}
            </p>
          );
        }}
      </Form.Item>

      <div className="flex justify-end my-2">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          {showAdvanced ? "Hide advanced fields" : "+ Advanced fields"}
        </button>
      </div>

      {showAdvanced && (
        <div className="pt-2 border-t border-gray-100 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item
              name="economic_operator_id"
              label="Economic Operator ID"
              tooltip="UUID of a Verantwoordelijke persoon already registered in your Bol.com account. Left blank, the first valid one is used."
              className="mb-3"
            >
              <Input className={MONO} placeholder="e.g. 82a254a0-3ecf-4d82-abc3-8ad0355ccc92" />
            </Form.Item>
            <Form.Item
              name="fulfilment_profile_id"
              label="Fulfilment Profile ID"
              tooltip="Bol.com delivery-promise profile UUID, if you use predefined shipping profiles."
              className="mb-3"
            >
              <Input className={MONO} placeholder="e.g. 0c6573a2-a80c-48b7-a03e-d5939f1173f1" />
            </Form.Item>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 rounded-[3px] border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-8 px-4 rounded-[3px] button-color text-xs font-semibold disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </Form>
  );
};

export default BolAccountForm;
