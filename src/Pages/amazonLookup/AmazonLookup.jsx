import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { TbBrandAmazon } from "react-icons/tb";
import { getToken } from "../../utils/session";

const AmazonLookup = () => {
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  const [formData, setFormData] = useState({
    asin: "",
    quantity: 1,
    account_id: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch("http://localhost:8002/users/amazon-affiliate-accounts", {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAccounts(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, account_id: data[0]._id }));
          }
        }
      } catch (error) {
        toast.error("Failed to load accounts");
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.account_id) {
      toast.error("Please select an Amazon account");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8002/api/remote-cart/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          asin: formData.asin,
          quantity: parseInt(formData.quantity) || 1,
          account_id: formData.account_id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        if (!data.is_available) {
          toast.error("This product is currently out of stock on Amazon.");
        }
      } else {
        const err = await response.json();
        toast.error(err.detail || "Failed to lookup product");
      }
    } catch (error) {
      toast.error("An error occurred during lookup");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    if (result?.checkout_url) {
      window.open(result.checkout_url, "_blank");
    }
  };

  return (
    <div className="p-6 font-poppins max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand/10 text-brand rounded-xl">
          <TbBrandAmazon size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Amazon Product Lookup</h1>
          <p className="text-sm text-gray-500">Generate Remote Cart links for better affiliate conversion</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amazon Account</label>
              {loadingAccounts ? (
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-full"></div>
              ) : (
                <select
                  name="account_id"
                  value={formData.account_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all bg-gray-50"
                  required
                >
                  <option value="" disabled>Select an account</option>
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.associate_tag}) - Amazon.{acc.region}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amazon ASIN</label>
              <input
                type="text"
                name="asin"
                value={formData.asin}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                placeholder="e.g. B08N5WRWNW"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="1"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || accounts.length === 0}
              className="mt-2 w-full bg-brand text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-brand/30 hover:bg-brand/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading ? "Verifying Product..." : "Check Product"}
            </button>
            {accounts.length === 0 && !loadingAccounts && (
              <p className="text-xs text-red-500 text-center mt-1">Please add an Affiliate Account first.</p>
            )}
          </form>
        </div>

        <div>
          {result && (
            <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-full animate-fade-in">
              <h2 className="text-xl font-semibold mb-6 border-b pb-4">Verification Result</h2>
              
              <div className="flex-1">
                {result.is_available ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">In Stock</p>
                        <p className="text-sm text-gray-500">Ready to be added to cart</p>
                      </div>
                    </div>
                    
                    {result.price && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Current Price</p>
                        <p className="text-2xl font-bold text-gray-900">{result.currency} {result.price}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Out of Stock / Unavailable</p>
                      <p className="text-sm text-gray-500">This item cannot be purchased currently.</p>
                    </div>
                  </div>
                )}
              </div>

              {result.is_available && (
                <button
                  onClick={handleCheckout}
                  className="mt-8 w-full bg-[#FF9900] text-black font-bold py-3.5 rounded-xl shadow-[0_4px_14px_rgba(255,153,0,0.39)] hover:bg-[#FF9900]/90 transition-all flex items-center justify-center gap-2 text-lg"
                >
                  <TbBrandAmazon size={22} />
                  Proceed to Checkout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmazonLookup;
