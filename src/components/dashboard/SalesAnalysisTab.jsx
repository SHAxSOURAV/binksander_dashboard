import { useState } from "react";
import { Select, Table, Tag } from "antd";
import {
  FiPieChart,
  FiShoppingBag,
  FiDollarSign,
  FiLayers,
} from "react-icons/fi";
import { useGetSalesAnalysisQuery } from "../../Redux/analyticsApis";

const SalesAnalysisTab = ({ range }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { data, isLoading } = useGetSalesAnalysisQuery({
    range,
    category: selectedCategory,
  });

  const res = data || {};
  const bestSelling = res.best_selling_items || [];
  const highestRevenue = res.highest_revenue_items || [];
  const categories = res.categories || [];

  const categoryOptions = [
    { label: "All Productgroepen (Categories)", value: "All" },
    ...categories.map((c) => ({
      label: c.category,
      value: c.category,
    })),
  ];

  const columns = [
    {
      title: "Product Title / EAN",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div>
          <p className="font-semibold text-gray-800 text-xs line-clamp-1">{text}</p>
          <span className="text-[10px] text-gray-400 font-mono">EAN: {record.ean}</span>
        </div>
      ),
    },
    {
      title: "Productgroep (Category)",
      dataIndex: "category",
      key: "category",
      render: (cat) => <Tag color="blue">{cat || "Algemeen"}</Tag>,
    },
    {
      title: "Units Sold",
      dataIndex: "units_sold",
      key: "units_sold",
      sorter: (a, b) => a.units_sold - b.units_sold,
      render: (qty) => <span className="font-bold text-gray-900">{qty}</span>,
    },
    {
      title: "Total Revenue (€)",
      dataIndex: "total_revenue",
      key: "total_revenue",
      sorter: (a, b) => a.total_revenue - b.total_revenue,
      render: (rev) => <span className="font-bold text-green-700">€{rev.toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Category Filter & Summary Header */}
      <div className="bg-white rounded-2xl p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FiLayers size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">
              Sales & Category Analysis ("Productgroepen")
            </h3>
            <p className="text-xs text-gray-400">
              Filtered by selected timeframe ({range})
            </p>
          </div>
        </div>

        <div className="w-full md:w-72">
          <label className="text-[11px] font-semibold text-gray-500 block mb-1">
            Filter by Productgroep
          </label>
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryOptions}
            className="w-full h-10"
          />
        </div>
      </div>

      {/* Top Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.slice(0, 3).map((cat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 card-shadow border border-gray-100 flex items-center justify-between">
            <div>
              <Tag color="geekblue" className="mb-1 font-semibold">{cat.category}</Tag>
              <p className="text-lg font-black text-gray-900 mt-1">€{cat.total_revenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cat.units_sold} units sold</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              #{idx + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Best Selling Items */}
        <div className="bg-white rounded-2xl p-5 card-shadow space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <FiShoppingBag className="text-indigo-600" /> Best Selling Items
            </h4>
            <span className="text-xs text-gray-400">By Units Sold</span>
          </div>
          <Table
            dataSource={bestSelling}
            columns={columns}
            rowKey="ean"
            pagination={{ pageSize: 5 }}
            loading={isLoading}
            size="small"
          />
        </div>

        {/* Highest Revenue Items */}
        <div className="bg-white rounded-2xl p-5 card-shadow space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <FiDollarSign className="text-green-600" /> Highest Revenue per Item
            </h4>
            <span className="text-xs text-gray-400">By Total Revenue</span>
          </div>
          <Table
            dataSource={highestRevenue}
            columns={columns}
            rowKey="ean"
            pagination={{ pageSize: 5 }}
            loading={isLoading}
            size="small"
          />
        </div>
      </div>
    </div>
  );
};

export default SalesAnalysisTab;
