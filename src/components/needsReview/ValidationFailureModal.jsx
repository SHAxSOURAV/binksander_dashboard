import React from "react";
import { Modal, Tag, Button } from "antd";
import { FiAlertCircle, FiInfo, FiXCircle, FiHelpCircle } from "react-icons/fi";

const ValidationFailureModal = ({ open, onClose, record, checkKey }) => {
  if (!record) return null;

  const checks = record.validation_checks || {};
  const status = checkKey ? checks[checkKey] : null;

  const checkDescriptions = {
    brand_blacklist: {
      title: "Blacklisted Brand Check",
      desc: "Checks the product's brand against your connected Brand Blacklist Google Sheets.",
      causes: {
        fail: "This product's brand is listed on your connected Brand Blacklist Google Sheets. Blacklisted brands are strictly prohibited from entering the Inventory Catalog.",
        uncertain: "Brand name could not be extracted or verified.",
        pass: "Product brand passed blacklist checks.",
      },
      fix: "If this product should be allowed into your catalog, remove its brand from your connected Brand Blacklist sheet in Settings → Connection, or click Re-validate to re-check.",
    },
    bolcom_duplicate_ean: {
      title: "Duplicate EAN Check",
      desc: "Checks Bol.com retailer catalog to see if the product's 13-digit EAN barcode is already listed.",
      causes: {
        fail: "This product's EAN is already actively listed on Bol.com catalog. Creating duplicate offers for an existing EAN is restricted.",
        uncertain: "The Bol.com Retailer API call failed, or API credentials for this account are missing or expired.",
        pass: "EAN is unique and ready to be listed on Bol.com."
      },
      fix: "Verify your Bol.com API credentials in Connection Settings or check if the EAN barcode is correct."
    },
    bolcom_duplicate_brand: {
      title: "Duplicate Brand Check",
      desc: "Performs a web search across bol.com to detect if this brand is already present on Bol.com.",
      causes: {
        fail: "Products from this brand already exist on Bol.com.",
        uncertain: "The web search API failed or TAVILY_API_KEY environment variable is missing.",
        pass: "Brand name check passed successfully."
      },
      fix: "Verify your brand name spelling or set TAVILY_API_KEY on the backend server."
    },
    amazon_in_stock: {
      title: "Amazon Stock Availability Check",
      desc: "Checks real-time inventory and supplier availability on Amazon.",
      causes: {
        fail: "This product is currently out of stock or unavailable on Amazon.",
        uncertain: "Stock status could not be verified from Amazon.",
        pass: "Product is in stock and available for fulfillment."
      },
      fix: "The system automatically re-checks this product every 30 days. When Amazon restocks it, it will automatically move to the Inventory Catalog."
    },
    delivery_time: {
      title: "Amazon Delivery Time Check (8-Day Maximum)",
      desc: "Checks estimated delivery timeframe from Amazon SP-API (must be 8 business days or faster).",
      causes: {
        fail: "This product has a delivery timeframe exceeding 8 business days or is backordered on Amazon.",
        uncertain: "Delivery timeframe could not be determined from Amazon.",
        pass: "Delivery timeframe is 8 days or faster."
      },
      fix: "Products requiring more than 8 days to deliver cannot meet standard Bol.com customer delivery commitments."
    },
    valid_supplier_link: {
      title: "Supplier Link Check",
      desc: "Checks that the Google Sheet supplier link is a valid Amazon product URL with an ASIN.",
      causes: {
        fail: "The supplier link in your Google Sheet (Column C) is not a valid Amazon URL or does not contain a product ASIN (/dp/B0...).",
        uncertain: "Supplier link could not be verified.",
        pass: "Supplier link is valid."
      },
      fix: "Update Column C in your Google Sheet with a valid Amazon URL (e.g. https://www.amazon.nl/dp/ASIN) and click Re-validate."
    }
  };

  const currentInfo = checkDescriptions[checkKey] || {
    title: checkKey ? `Validation Check: ${checkKey}` : "Validation Check Details",
    desc: "Automated validation check performed during spreadsheet import.",
    causes: {
      fail: "Check failed.",
      uncertain: "Check result is uncertain due to API or service error.",
      pass: "Check passed."
    },
    fix: "Review item details or click Re-validate to retry."
  };

  const reasons = record.validation_reasons || [];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose} className="bg-brand hover:bg-brand-dark">
          Close Diagnostic
        </Button>
      ]}
      title={
        <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <FiAlertCircle className="text-amber-500" />
          <span>{currentInfo.title}</span>
        </div>
      }
      centered
      width={560}
    >
      <div className="py-4 space-y-4 text-sm font-poppins">
        {/* Product Details Header */}
        <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center gap-3">
          {record.product_photo && (
            <img src={record.product_photo} alt="" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
          )}
          <div>
            <h4 className="font-semibold text-gray-800 line-clamp-1">{record.product_title || record.TITLE || record.title || "Product"}</h4>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span>EAN: <strong>{record.EAN || record.ean || "—"}</strong></span>
              <span>ASIN: <strong>{record.asin || "—"}</strong></span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        {checkKey && (
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <span className="font-semibold text-gray-700">Check Status:</span>
            <Tag color={status === "fail" ? "red" : status === "uncertain" ? "orange" : "green"} className="text-xs px-2.5 py-1 uppercase font-bold m-0">
              {status}
            </Tag>
          </div>
        )}

        {/* Failure Cause */}
        <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl space-y-2">
          <h4 className="font-semibold text-amber-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <FiInfo /> Diagnostic Cause
          </h4>
          <p className="text-amber-950 leading-relaxed text-xs">
            {currentInfo.causes[status] || currentInfo.desc}
          </p>
        </div>

        {/* Failure Reasons list */}
        {reasons.length > 0 && (
          <div className="bg-red-50/60 border border-red-200/80 p-4 rounded-xl space-y-2">
            <h4 className="font-semibold text-red-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <FiXCircle /> Detailed Error Messages
            </h4>
            <ul className="space-y-1">
              {reasons.map((r, idx) => (
                <li key={idx} className="text-red-900 text-xs font-medium flex items-start gap-2">
                  <span className="text-red-500">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resolution Advice */}
        <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl space-y-2">
          <h4 className="font-semibold text-blue-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <FiHelpCircle /> Recommended Action
          </h4>
          <p className="text-blue-950 leading-relaxed text-xs">
            {currentInfo.fix}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ValidationFailureModal;
