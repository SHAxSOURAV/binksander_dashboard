import React, { useState } from "react";
import { Empty, Table, Tag, message, Tooltip, Button, Select } from "antd";
import { FiAlertCircle, FiCopy, FiRefreshCw, FiExternalLink, FiCheck, FiCheckCircle } from "react-icons/fi";
import { 
  useGetNeedsReviewItemsQuery, 
  useRevalidateItemMutation, 
  useSyncConnectedSheetMutation,
  useForcePassItemMutation,
  useForcePassBulkMutation,
  useGetFiltersMetaQuery
} from "../../Redux/productApis";
import Pagination from "../../components/shared/Pagination";
import ValidationFailureModal from "../../components/needsReview/ValidationFailureModal";

const NeedsReview = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filterBrand, setFilterBrand] = useState(null);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { data, isLoading } = useGetNeedsReviewItemsQuery({ page, limit, filter_brand: filterBrand }, { pollingInterval: 5000 });
  const { data: filtersMeta } = useGetFiltersMetaQuery();
  const [revalidateItem] = useRevalidateItemMutation();
  const [syncConnectedSheet, { isLoading: isSyncingSheet }] = useSyncConnectedSheetMutation();
  const [forcePassItem] = useForcePassItemMutation();
  const [forcePassBulk, { isLoading: isForcePassingBulk }] = useForcePassBulkMutation();

  const handleRevalidateItem = async (id) => {
    try {
      await revalidateItem(id).unwrap();
      message.success("Item queued for re-validation!");
    } catch (err) {
      message.error("Failed to revalidate item");
    }
  };

  const handleSyncSpreadsheet = async () => {
    try {
      const res = await syncConnectedSheet().unwrap();
      if (res.success) {
        message.success(res.message || "Spreadsheet synced! Checked for new products.");
      } else {
        message.info(res.message || "No new products found.");
      }
    } catch (err) {
      message.error("Failed to sync spreadsheet");
    }
  };

  const handleForcePassItem = async (id) => {
    try {
      await forcePassItem(id).unwrap();
      message.success("Product forcibly approved and added to catalog!");
    } catch (err) {
      message.error("Failed to approve product");
    }
  };

  const handleForcePassBulk = async () => {
    if (!selectedRowKeys.length) return;
    try {
      const res = await forcePassBulk(selectedRowKeys).unwrap();
      message.success(res.message || `Forcibly approved ${selectedRowKeys.length} product(s)!`);
      setSelectedRowKeys([]);
    } catch (err) {
      message.error("Failed to approve selected products");
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success(`Copied: ${text}`);
  };

  const columns = [
    {
      title: "Title / Code",
      key: "title",
      render: (_, record) => {
        const ean = record.EAN || record.ean;
        const asin = record.asin;
        const codeToDisplay = ean || asin;
        const codeLabel = ean ? "EAN" : "ASIN";
        const title = record.product_title || record.TITLE || record.title || "No Title";
        const brand = record.product_brand;
        const photo = record.product_photo;
        
        return (
          <div className="flex items-start gap-3">
            {photo && (
              <img 
                src={photo} 
                alt="Product" 
                className="w-10 h-10 rounded-md object-cover border border-gray-100 flex-shrink-0"
              />
            )}
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-1 max-w-[250px] line-clamp-2 leading-snug">{title}</p>
              {brand && (
                <div className="mb-1">
                  <span className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[10px] font-bold">
                    {brand}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono mt-1">
                <span className="font-medium tracking-wide text-[9px] uppercase">{codeLabel}:</span>
                <span>{codeToDisplay || "—"}</span>
                {codeToDisplay && (
                  <Tooltip title="Copy">
                    <button 
                      onClick={() => handleCopy(codeToDisplay)}
                      className="text-gray-400 hover:text-brand transition-colors"
                    >
                      <FiCopy size={12} />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Supplier Link",
      key: "supplier",
      render: (_, record) => (
        record.supplier_link ? (
          <a 
            href={record.supplier_link} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1 text-brand hover:text-brand-dark hover:underline text-sm truncate max-w-[200px]"
          >
            View Source <FiExternalLink size={12} />
          </a>
        ) : <span className="text-gray-400">—</span>
      ),
    },
    {
      title: "Failing Checks",
      key: "checks",
      render: (_, record) => {
        const checks = record.validation_checks || {};
        const labelMap = {
          bolcom_duplicate_ean: "Duplicate EAN",
          bolcom_duplicate_brand: "Duplicate Brand",
          amazon_low_rating: "Low Rating"
        };
        const statusMap = {
          fail: "Failed Check",
          uncertain: "API Failed",
          pass: "Passed"
        };
        return (
          <div className="flex flex-col gap-1">
            {Object.entries(checks).map(([key, val]) => {
              if (val === "pass") return null;
              const color = val === "fail" ? "red" : "orange";
              const label = labelMap[key] || key;
              const statusText = key === "amazon_low_rating" && val === "fail" ? "< 3.5 Stars" : (statusMap[val] || val.toUpperCase());
              return (
                <button
                  key={key}
                  onClick={() => setSelectedFailure({ record, checkKey: key })}
                  className="text-left cursor-pointer transition-transform hover:scale-105"
                  title="Click to view failure details"
                >
                  <Tag color={color} className="w-fit m-0 font-semibold cursor-pointer px-2 py-0.5 text-xs rounded-md">
                    {label}: {statusText}
                  </Tag>
                </button>
              );
            })}
          </div>
        );
      }
    },
    {
      title: "Reasons & Notes",
      key: "reasons",
      render: (_, record) => {
        const formatReason = (text) => {
          if (!text) return "Validation Failed";
          if (text.includes("Rating") || text.includes("3.5")) return text;
          if (text.includes("EAN")) return "EAN Already Listed";
          if (text.includes("Brand")) return "Brand Already Listed";
          if (text.includes("API call failed") || text.includes("credentials")) return "Bol Connection Error";
          if (text.includes("Tavily") || text.includes("search")) return "Search Service Error";
          return text;
        };

        return (
          <div className="flex flex-col gap-1">
            {(record.validation_reasons || []).map((reason, i) => (
              <button
                key={i}
                onClick={() => setSelectedFailure({ record, checkKey: null })}
                className="text-left cursor-pointer hover:underline"
              >
                <p className="text-sm text-red-600 mb-0 flex items-center gap-1 font-medium">
                  <FiAlertCircle size={12} className="shrink-0" /> {formatReason(reason)}
                </p>
              </button>
            ))}
          </div>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => {
        if (record.validation_status === "PROCESSING") {
          return (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand uppercase tracking-wide">
              <FiRefreshCw className="animate-spin" /> Processing
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <button 
              className="text-xs font-semibold px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
              onClick={() => handleRevalidateItem(record._id)}
            >
              Re-validate
            </button>
            <button 
              className="text-xs font-semibold px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              onClick={() => handleForcePassItem(record._id)}
              title="Force validation pass and move to catalog"
            >
              <FiCheck size={13} /> Force Pass
            </button>
          </div>
        );
      },
    }
  ];

  const rawItems = data?.items || [];
  const items = [...rawItems].sort(
    (a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0)
  );
  const totalPages = data?.total_pages || 0;
  const totalItems = data?.total || 0;

  const brandOptions = [
    { label: "All Brands", value: null },
    ...(filtersMeta?.brands || []).map((b) => ({ label: b, value: b }))
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f8] font-poppins">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Needs Review</h1>
            <p className="text-gray-500 text-sm">
              Products that failed validation during import. Review the reasons and re-validate them to add to your catalog.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selectedRowKeys.length > 0 && (
              <Button
                type="primary"
                onClick={handleForcePassBulk}
                loading={isForcePassingBulk}
                icon={<FiCheckCircle />}
                className="bg-green-600 hover:bg-green-700 h-10 font-semibold shadow-sm border-0"
              >
                Force Pass Selected ({selectedRowKeys.length})
              </Button>
            )}

            {/* Brand Dropdown Select */}
            <Select
              value={filterBrand}
              onChange={(val) => {
                setFilterBrand(val);
                setPage(1);
              }}
              options={brandOptions}
              placeholder="Filter Brand"
              className="w-48 h-10 shadow-sm"
              allowClear
            />

            <button
              onClick={handleSyncSpreadsheet}
              disabled={isSyncingSheet}
              title="Sync from spreadsheet"
              className="w-10 h-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-brand disabled:opacity-50 transition-colors shadow-sm"
            >
              <FiRefreshCw size={16} className={isSyncingSheet ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          <Table 
            dataSource={items}
            columns={columns}
            rowKey="_id"
            pagination={false}
            loading={isLoading}
            rowSelection={{
              selectedRowKeys,
              onChange: (newKeys) => setSelectedRowKeys(newKeys)
            }}
            locale={{
              emptyText: <Empty description="No products need review right now." />
            }}
          />
        </div>

        {totalItems > 0 && (
          <div className="mt-6">
            <Pagination
              current={page}
              total={totalPages}
              pageSize={limit}
              onChange={setPage}
              onPageSizeChange={setLimit}
            />
          </div>
        )}

        <ValidationFailureModal
          open={!!selectedFailure}
          onClose={() => setSelectedFailure(null)}
          record={selectedFailure?.record}
          checkKey={selectedFailure?.checkKey}
        />
      </div>
    </div>
  );
};

export default NeedsReview;
