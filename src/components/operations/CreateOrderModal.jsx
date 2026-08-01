import { useState } from "react";
import { Modal, Input, Button, Select, Checkbox, message } from "antd";
import { FiPlus, FiTrash2, FiBox, FiUser, FiMapPin, FiCheckCircle } from "react-icons/fi";
import { useCreateRimcoOrderMutation, useGetLiveRimcoProductsQuery } from "../../Redux/rimcoApis";

const CreateOrderModal = ({ open, onClose, onSuccess }) => {
  const [createOrder, { isLoading }] = useCreateRimcoOrderMutation();
  const { data: productsData } = useGetLiveRimcoProductsQuery({ page: 1, limit: 100 });
  const liveProducts = productsData?.products || [];

  const [form, setForm] = useState({
    reference: "",
    expected_handover_date: "",
    tags: "",
    accept_returns: true,
    is_gift: false,
    is_b2b: false,
    email: "",
    phone: "",
    fullname: "",
    company_name: "",
    address_line_1: "",
    address_line_2: "",
    postal_code: "",
    city: "",
    country: "NETHERLANDS",
    items: [
      { product_id: "", sku: "", title: "", amount: 1, price: 0 }
    ]
  });

  const handleChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleItemChange = (idx, field, val) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      newItems[idx] = { ...newItems[idx], [field]: val };
      return { ...prev, items: newItems };
    });
  };

  const handleSelectProduct = (idx, prodId) => {
    const selectedProd = liveProducts.find((p) => String(p.id) === String(prodId));
    if (selectedProd) {
      setForm((prev) => {
        const newItems = [...prev.items];
        newItems[idx] = {
          ...newItems[idx],
          product_id: selectedProd.id,
          sku: selectedProd.sku || "",
          title: selectedProd.name || "",
          price: selectedProd.price || 0,
        };
        return { ...prev, items: newItems };
      });
    }
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: "", sku: "", title: "", amount: 1, price: 0 }]
    }));
  };

  const removeItem = (idx) => {
    if (form.items.length === 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async () => {
    if (!form.email) {
      message.error("Customer email is required");
      return;
    }
    if (!form.fullname || !form.address_line_1 || !form.postal_code || !form.city) {
      message.error("Please fill in complete shipping address details");
      return;
    }

    try {
      const payload = {
        bol_order_id: form.reference || `MANUAL-${Date.now()}`,
        status: "purchased",
        title: form.items[0]?.title || "Manual Fulfillment Order",
        bol_price: form.items.reduce((sum, it) => sum + (it.price * it.amount), 0),
        ship_to: {
          name: form.fullname,
          email: form.email,
          phone: form.phone,
          address: `${form.address_line_1} ${form.address_line_2}`.trim(),
          zip: form.postal_code,
          city: form.city,
          country: form.country,
          company: form.company_name,
        },
        items: form.items,
        accept_returns: form.accept_returns,
        is_gift: form.is_gift,
        is_b2b: form.is_b2b,
        expected_handover_date: form.expected_handover_date,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : []
      };

      await createOrder(payload).unwrap();
      message.success("New order created and submitted successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      message.error(err?.data?.detail || "Failed to create new order");
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      centered
      className="font-poppins"
      title={
        <div className="flex items-center gap-2 text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
          <FiBox size={18} className="text-red-500" />
          Create New Rimco Order
        </div>
      }
    >
      <div className="space-y-5 pt-3 max-h-[75vh] overflow-y-auto pr-1 thin-scrollbar text-xs">
        {/* SECTION 1: General Preferences */}
        <div className="bg-gray-50/80 p-4 rounded-xl space-y-3 border border-gray-100">
          <p className="font-bold text-gray-800 text-xs uppercase tracking-wider">General Preferences</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Reference (Optional)</label>
              <Input
                placeholder="e.g. PO-AMZ-987654"
                value={form.reference}
                onChange={(e) => handleChange("reference", e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Expected Handover Date</label>
              <Input
                type="date"
                value={form.expected_handover_date}
                onChange={(e) => handleChange("expected_handover_date", e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tags (Comma-separated)</label>
            <Input
              placeholder="e.g. Urgent, Amazon EU"
              value={form.tags}
              onChange={(e) => handleChange("tags", e.target.value)}
              className="rounded-lg text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-1 text-xs">
            <Checkbox
              checked={form.accept_returns}
              onChange={(e) => handleChange("accept_returns", e.target.checked)}
            >
              Accept returns for this order
            </Checkbox>
            <Checkbox
              checked={form.is_gift}
              onChange={(e) => handleChange("is_gift", e.target.checked)}
            >
              This order is a gift
            </Checkbox>
            <Checkbox
              checked={form.is_b2b}
              onChange={(e) => handleChange("is_b2b", e.target.checked)}
            >
              This is a B2B order
            </Checkbox>
          </div>
        </div>

        {/* SECTION 2: Customer and Shipping Address */}
        <div className="bg-gray-50/80 p-4 rounded-xl space-y-3 border border-gray-100">
          <p className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <FiUser size={14} /> Customer &amp; Shipping Address
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Customer Email <span className="text-red-500">*</span></label>
              <Input
                placeholder="customer@example.nl"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Phone Number</label>
              <Input
                placeholder="+31 6 12345678"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
              <Input
                placeholder="Full Name"
                value={form.fullname}
                onChange={(e) => handleChange("fullname", e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Company Name</label>
              <Input
                placeholder="Company Name (Optional)"
                value={form.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Addressline 1 <span className="text-red-500">*</span></label>
            <Input
              placeholder="Street name and house number"
              value={form.address_line_1}
              onChange={(e) => handleChange("address_line_1", e.target.value)}
              className="rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Addressline 2 (Optional)</label>
            <Input
              placeholder="Apartment, suite, unit, etc."
              value={form.address_line_2}
              onChange={(e) => handleChange("address_line_2", e.target.value)}
              className="rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Postal Code <span className="text-red-500">*</span></label>
              <Input
                placeholder="1012 AB"
                value={form.postal_code}
                onChange={(e) => handleChange("postal_code", e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">City <span className="text-red-500">*</span></label>
              <Input
                placeholder="Amsterdam"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Country</label>
              <Input
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Products */}
        <div className="bg-gray-50/80 p-4 rounded-xl space-y-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-800 text-xs uppercase tracking-wider">Products</p>
            <Button
              type="dashed"
              size="small"
              icon={<FiPlus />}
              onClick={addItem}
              className="text-xs rounded-lg"
            >
              Add Item
            </Button>
          </div>

          {form.items.map((item, idx) => (
            <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Select Product Catalog / Title</label>
                  <Select
                    showSearch
                    placeholder="Search product in catalog..."
                    className="w-full text-xs"
                    value={item.product_id || undefined}
                    onChange={(val) => handleSelectProduct(idx, val)}
                    options={liveProducts.map((p) => ({
                      value: p.id,
                      label: `${p.sku || 'SKU'} - ${p.name}`
                    }))}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Qty</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.amount}
                    onChange={(e) => handleItemChange(idx, "amount", Number(e.target.value))}
                    className="rounded-lg text-xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Price (€)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.price}
                    onChange={(e) => handleItemChange(idx, "price", Number(e.target.value))}
                    className="rounded-lg text-xs"
                  />
                </div>

                <div className="sm:col-span-1 text-right pt-4 sm:pt-0">
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <Button onClick={onClose} className="rounded-xl h-10 px-5 text-xs font-semibold">
            Cancel
          </Button>
          <Button
            type="primary"
            loading={isLoading}
            onClick={handleSubmit}
            icon={<FiCheckCircle />}
            className="rounded-xl h-10 px-6 text-xs font-bold bg-red-600 hover:bg-red-700 border-none shadow-sm"
          >
            Place Order
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateOrderModal;
