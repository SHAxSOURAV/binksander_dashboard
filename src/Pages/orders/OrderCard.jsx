import React, { useState } from "react";
import { Checkbox, Select, Input, message } from "antd";
import { FiCopy, FiHome, FiFileText, FiMoreVertical, FiTruck, FiSend } from "react-icons/fi";
import { useShipBolOrderMutation } from "../../Redux/analyticsApis";

const OrderCard = ({ order, onClick }) => {
  // Format Date: e.g. "2026-06-28 12:18:05" -> "28 June 12:18"
  const dateStr = order.orderPlacedDateTime || "";
  let formattedDate = dateStr;
  try {
    const d = new Date(dateStr);
    formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + " " + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch(e) {}

  const shipment = order.shipmentDetails || {};
  const customerName = `${shipment.firstName || ""} ${shipment.surname || ""}`.trim() || "Unknown Customer";
  
  const addressLine1 = `${shipment.streetName || ""} ${shipment.houseNumber || ""} ${shipment.houseNumberExtension || ""}`.trim();
  const addressLine2 = `${shipment.zipCode || ""} ${shipment.city || ""} ${shipment.countryCode || ""}`.trim();

  const handleCopy = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  const [carrier, setCarrier] = useState(null);
  const [tracking, setTracking] = useState("");
  const [shipOrder, { isLoading: isShipping }] = useShipBolOrderMutation();

  const handleShipOrder = async (e) => {
    e.stopPropagation();
    if (!carrier) return message.warning("Please select a carrier");
    if (!tracking) return message.warning("Please enter a track & trace number");

    try {
      await shipOrder({
        orderId: order.orderId,
        data: {
          transporter_code: carrier,
          track_and_trace: tracking,
        }
      }).unwrap();
      message.success("Order shipped successfully!");
    } catch (err) {
      console.error(err);
      message.error(err?.data?.detail || "Failed to ship order");
    }
  };

  const isOpen = order.status === "OPEN";

  return (
    <div 
      className="bg-white border border-[#e2e8f0] rounded-md mb-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
      onClick={onClick}
    >
      {/* Top Section */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center p-4 border-b border-gray-100 gap-4 xl:gap-8">
        
        <div className="flex items-start gap-4 xl:w-[30%]">
          <Checkbox onClick={(e) => e.stopPropagation()} className="mt-1" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              {order.orderId}
              <span className="text-[11px] font-normal text-gray-500">{formattedDate}</span>
              {order.status === "SHIPPED" && <span className="w-3 h-1 bg-green-500 rounded-full" title="Shipped"></span>}
              {order.status === "OPEN" && <span className="w-3 h-1 bg-yellow-500 rounded-full" title="Open"></span>}
              {order.status === "CANCELLED" && <span className="w-3 h-1 bg-red-500 rounded-full" title="Cancelled"></span>}
            </span>
            <div className="flex items-center gap-1 mt-1 text-sm text-blue-800 font-medium hover:underline">
              {shipment.countryCode === "NL" && <span title="Netherlands">🇳🇱</span>}
              {shipment.countryCode === "BE" && <span title="Belgium">🇧🇪</span>}
              <span>{customerName}</span>
              <FiCopy 
                className="cursor-pointer text-blue-500 hover:text-blue-700 ml-1" 
                onClick={(e) => handleCopy(customerName, e)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 xl:w-[25%]">
          <FiHome className="text-gray-400 mt-1" />
          <div className="flex flex-col">
            <span className="text-sm text-gray-700">{addressLine1 || "No Address Provided"}</span>
            <span className="text-xs text-gray-500">{addressLine2}</span>
          </div>
          <FiCopy 
            className="cursor-pointer text-blue-500 hover:text-blue-700 mt-1 ml-auto" 
            onClick={(e) => handleCopy(`${addressLine1}, ${addressLine2}`, e)}
          />
        </div>

        <div className="flex flex-col gap-2 xl:w-[25%] w-full" onClick={(e) => e.stopPropagation()}>
          {isOpen ? (
            <>
              <Select 
                placeholder="Select carrier" 
                size="small" 
                className="w-full text-xs"
                options={[{ value: 'POSTNL', label: 'PostNL' }, { value: 'DHL', label: 'DHL' }]}
                value={carrier}
                onChange={setCarrier}
              />
              <Input 
                placeholder="Track & trace number" 
                size="small" 
                className="text-xs" 
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
              />
              <Input placeholder="Own characteristic" size="small" className="text-xs hidden" />
            </>
          ) : (
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Carrier details</span>
              <span className="text-sm text-gray-700 font-medium">Shipped</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-start xl:items-end xl:w-[20%] gap-2 border-l border-gray-100 pl-4">
          <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
            <FiTruck className={isOpen ? "text-orange-500" : "text-green-500"} />
            <span>{isOpen ? "Delivery Deadline" : "Status"}</span>
          </div>
          <span className={`px-3 py-1 text-xs border rounded font-medium text-center min-w-[120px] ${isOpen ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-green-200 text-green-700 bg-green-50'}`}>
            {order.status || "Processing"}
          </span>
          {isOpen && (
            <button 
              className="flex items-center justify-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md mt-1 w-full shadow-sm transition-colors disabled:opacity-50" 
              onClick={handleShipOrder}
              disabled={isShipping}
            >
              <FiSend />
              {isShipping ? "Shipping..." : "Ship Order"}
            </button>
          )}
        </div>

      </div>

      {/* Bottom Section (Items) */}
      <div className="p-4 bg-white rounded-b-md flex flex-col gap-3">
        {(order.items || []).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                {item.productImage ? (
                  <img src={item.productImage} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-xs font-bold text-blue-800 opacity-30">bol</div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800 line-clamp-1 cursor-pointer hover:text-blue-700 hover:underline">
                  {item.productTitle || item.product?.title || item.title || order.productTitle || "Product Name"}
                </span>
                <span className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                  <FiCopy className="cursor-pointer text-blue-400 hover:text-blue-600" onClick={(e) => handleCopy(item.ean || item.product?.ean, e)} />
                  EAN: {item.ean || item.product?.ean} | Condition: {item.condition || "New"}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-700">{item.quantity || 1}</span>
              <span className="text-sm font-semibold text-gray-800">€{item.offerPrice ?? item.unitPrice ?? "—"}</span>
              <FiMoreVertical className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderCard;
