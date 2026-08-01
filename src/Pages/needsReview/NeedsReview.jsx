import React, { useState } from "react";
import { Empty, Table, Tag, message, Tooltip, Button } from "antd";
import { FiAlertCircle, FiCopy, FiRefreshCw, FiExternalLink } from "react-icons/fi";
import { 
  useGetNeedsReviewItemsQuery, 
  useRevalidateItemMutation, 
  useRevalidateAllMutation,
  useGetFiltersMetaQuery
} from "../../Redux/productApis";
import Pagination from "../../components/shared/Pagination";

const NeedsReview = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filterBrand, setFilterBrand] = useState(null);

  const { data, isLoading } = useGetNeedsReviewItemsQuery({ page, limit, filter_brand: filterBrand }, { pollingInterval: 5000 });
  const { data: filtersMeta } = useGetFiltersMetaQuery();
  const [revalidateItem, { isLoading: isRevalidatingItem }] = useRevalidateItemMutation();
  const [revalidateAll, { isLoading: isRevalidatingAll }] = useRevalidateAllMutation();

  const handleRevalidateItem = async (id) => {
    try {
      await revalidateItem(id).unwrap();
      message.success("Item queued for re-validation!");
    } catch (err) {
      message.error("Failed to revalidate item");
    }
  };

  const handleRevalidateAll = async () => {
    try {
      await revalidateAll().unwrap();
      message.success("All items queued for re-validation!");
    } catch (err) {
      message.error("Failed to revalidate items");
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
        return (
          <div className="flex flex-col gap-1">
            {Object.entries(checks).map(([key, val]) => {
              if (val === "pass") return null;
              const color = val === "fail" ? "red" : "orange";
              return (
                <Tag color={color} key={key} className="w-fit m-0">
                  {key}: {val.toUpperCase()}
                </Tag>
              );
            })}
          </div>
        );
      }
    },
    {
      title: "Reasons & Notes",
      key: "reasons",
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          {(record.validation_reasons || []).map((reason, i) => (
            <p key={i} className="text-sm text-red-600 mb-0 flex items-center gap-1">
              <FiAlertCircle size={12} className="shrink-0" /> {reason}
            </p>
          ))}
        </div>
      ),
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
          <button 
            className="text-xs font-semibold px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
            onClick={() => handleRevalidateItem(record._id)}
          >
            Re-validate
          </button>
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
          {totalItems > 0 && (
            <Button
              type="primary"
              onClick={handleRevalidateAll}
              loading={isRevalidatingAll}
              icon={<FiRefreshCw />}
              className="bg-brand hover:bg-brand-dark"
            >
              Re-run All Checks
            </Button>
          )}
        </div>

        {/* Brand Filter Bar */}
        {filtersMeta?.brands?.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 text-sm font-medium">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mr-1">Brands:</span>
            {filtersMeta.brands.map((brand) => (
              <button
                key={brand}
                onClick={() => {
                  setFilterBrand(prev => prev === brand ? null : brand);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all duration-200 text-xs ${
                  filterBrand === brand
                    ? "bg-blue-500 text-white shadow-sm font-semibold"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          <Table 
            dataSource={items}
            columns={columns}
            rowKey="_id"
            pagination={false}
            loading={isLoading}
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
      </div>
    </div>
  );
};

export default NeedsReview;
