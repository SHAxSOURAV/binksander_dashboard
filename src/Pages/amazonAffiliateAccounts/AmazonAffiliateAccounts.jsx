import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

const AmazonAffiliateAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    associate_tag: "",
    region: "com",
    app_id: "",
    client_secret: "",
  });

  const fetchAccounts = async () => {
    try {
      const response = await fetch("http://localhost:8002/users/amazon-affiliate-accounts", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      toast.error("Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8002/users/amazon-affiliate-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Account added successfully");
        setFormData({ name: "", associate_tag: "", region: "com", app_id: "", client_secret: "" });
        fetchAccounts();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to add account");
      }
    } catch (error) {
      toast.error("Failed to submit form");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this account?")) return;
    try {
      const response = await fetch(`http://localhost:8002/users/amazon-affiliate-accounts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        toast.success("Account deleted");
        fetchAccounts();
      } else {
        toast.error("Failed to delete account");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="p-6 font-poppins">
      <h1 className="text-2xl font-semibold mb-6">Amazon Affiliate Accounts</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-medium mb-4">Add New Account</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Account Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand"
                placeholder="e.g. My US Account"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Associate Tag</label>
              <input
                type="text"
                name="associate_tag"
                value={formData.associate_tag}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand"
                placeholder="mytag-20"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Region</label>
              <select
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand"
              >
                <option value="com">.com (US)</option>
                <option value="co.uk">.co.uk (UK)</option>
                <option value="de">.de (Germany)</option>
                <option value="nl">.nl (Netherlands)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">App ID (Creators API)</label>
              <input
                type="text"
                name="app_id"
                value={formData.app_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Client Secret</label>
              <input
                type="password"
                name="client_secret"
                value={formData.client_secret}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="bg-brand text-white font-medium py-2 rounded-lg hover:bg-brand/90 transition-colors mt-2"
            >
              Save Account
            </button>
          </form>
        </div>

        <div className="col-span-2">
          {loading ? (
            <p>Loading...</p>
          ) : accounts.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-40">
              <p className="text-gray-500">No affiliate accounts configured.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <div key={acc._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-800">{acc.name}</h3>
                      <span className="text-xs bg-brand/10 text-brand px-2 py-1 rounded-md font-medium uppercase">
                        {acc.region}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Tag: <span className="font-medium">{acc.associate_tag}</span></p>
                    <p className="text-xs text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded border border-green-100 mt-2">
                      Credentials configured
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(acc._id)}
                    className="text-red-500 text-sm font-medium hover:text-red-700 mt-4 text-left w-fit transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmazonAffiliateAccounts;
