import { useState } from "react";
import { Input, Spin, Empty, Modal } from "antd";
import { FiSearch, FiRefreshCw } from "react-icons/fi";
import Pagination from "../../components/shared/Pagination";
import { useGetBolOrdersQuery, useSyncNowMutation } from "../../Redux/analyticsApis";
import { useGetBolCredentialsQuery } from "../../Redux/connectionApis";
import OrderCard from "./OrderCard";
import { useUI } from "../../Provider/ContextProvider";
import { LuUnplug } from "react-icons/lu";

const STATUS_META = {
  OPEN: { label: "Open", color: "#D97706", bg: "#FFF7E6" },
  SHIPPED: { label: "Shipped", color: "#16A34A", bg: "#E9F9F0" },
  CANCELLED: { label: "Cancelled", color: "#DC2626", bg: "#FDECEC" },
  ALL: { label: "—", color: "#6B7280", bg: "#F3F4F6" },
};
const meta = (s) =>
  STATUS_META[s] || { label: s || "—", color: "#6B7280", bg: "#F3F4F6" };

const Orders = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState(null);
  const { openSettings } = useUI();

  const { data: bolCreds, isLoading: credsLoading } = useGetBolCredentialsQuery();
  const isNotConnected = !credsLoading && (!bolCreds || !bolCreds.is_secret_set);

  const [syncNow, { isLoading: isSyncing }] = useSyncNowMutation();

  const { data, isLoading, isFetching, isError, refetch } = useGetBolOrdersQuery({
    page,
    limit,
  });

  const handleSync = async () => {
    try {
      await syncNow().unwrap();
      // Refetch data after a small delay to allow background job to save some
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  const orders = data?.orders || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, data?.total_pages || 1);

  const rows = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.productTitle || "").toLowerCase().includes(q) ||
      (o.orderId || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl p-5 card-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Bol Orders</h2>
          <p className="text-xs text-gray-400">{total} Bol.com order(s)</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<FiSearch className="text-gray-400 mr-1" />}
            placeholder="Search"
            className="h-10 rounded-lg flex-1 sm:w-72"
          />
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="h-10 px-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm shadow-sm transition-all whitespace-nowrap disabled:opacity-50"
          >
            <FiRefreshCw className={isSyncing ? "animate-spin text-blue-600" : "text-gray-500"} />
            Sync Now
          </button>
        </div>
      </div>

      {isFetching || credsLoading ? (
        <div className="flex flex-col gap-2 mt-4">
          <div className="hidden xl:flex bg-[#f9fafc] text-transparent text-xs font-semibold px-4 py-2 border-b border-gray-100 uppercase tracking-wide animate-pulse">
            <span className="w-[30%]"><div className="h-3 bg-gray-200 rounded w-16"></div></span>
            <span className="w-[25%]"><div className="h-3 bg-gray-200 rounded w-20"></div></span>
            <span className="w-[25%] pl-2"><div className="h-3 bg-gray-200 rounded w-24"></div></span>
            <span className="w-[20%] text-right pr-4 flex justify-end"><div className="h-3 bg-gray-200 rounded w-28"></div></span>
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 h-28 flex flex-col xl:flex-row items-start xl:items-center animate-pulse gap-4">
              <div className="w-full xl:w-[30%] flex flex-col gap-2">
                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
              <div className="hidden xl:flex w-[25%] flex-col gap-2">
                <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
              <div className="hidden xl:flex w-[25%] pl-2 flex-col gap-2">
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/3"></div>
              </div>
              <div className="w-full xl:w-[20%] flex flex-row xl:flex-col items-center xl:items-end justify-between xl:justify-center gap-2 pr-4">
                <div className="h-7 bg-gray-100 rounded-full w-24"></div>
                <div className="h-4 bg-gray-100 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : isError || isNotConnected ? (
        <div className="flex flex-col justify-center items-center py-20 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 my-4 mx-2">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <LuUnplug size={32} />
          </div>
          <h3 className="text-gray-800 text-lg font-semibold mb-2">Bol.com Not Connected</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md text-center">
            We couldn't load your orders. This usually happens when your API keys are missing or invalid. Please connect your Bol.com account to continue.
          </p>
          <button 
            onClick={() => openSettings("connection")}
            className="bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors shadow-sm"
          >
            Connect Bol.com API
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16">
          <Empty description="No orders yet. Use Sync on the Dashboard to pull orders from Bol.com." />
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          <div className="hidden xl:flex bg-[#f9fafc] text-gray-500 text-xs font-semibold px-4 py-2 border-b border-gray-100 uppercase tracking-wide">
            <span className="w-[30%]">Details</span>
            <span className="w-[25%]">Address</span>
            <span className="w-[25%] pl-2">Shipping Info</span>
            <span className="w-[20%] text-right pr-4">Status & Actions</span>
          </div>
          {rows.map((o) => (
            <OrderCard key={o.id} order={o} onClick={() => setSelected(o)} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <Pagination 
          current={page} 
          total={totalPages} 
          onChange={setPage} 
          pageSize={limit}
          onPageSizeChange={setLimit}
          totalItems={total}
          pageSizeOptions={[24, 50, 100, 200]}
        />
      )}

      {/* Order detail */}
      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        centered
        width={560}
      >
        {selected && (
          <div className="font-poppins pt-2">
            <div className="flex items-center justify-between pr-6 mb-1">
              <h2 className="text-base font-bold text-brand">
                Order <span className="text-gray-700">{selected.orderId}</span>
              </h2>
              <span
                className="text-[11px] font-semibold px-3 py-1 rounded-full"
                style={{ color: meta(selected.status).color, backgroundColor: meta(selected.status).bg }}
              >
                {meta(selected.status).label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {(selected.orderPlacedDateTime || "").slice(0, 19).replace("T", " ")}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Stat label="Revenue" value={`€${selected.totalRevenue}`} />
              <Stat
                label="Net Income"
                value={`€${selected.totalNetIncome}`}
                positive={selected.totalNetIncome >= 0}
              />
            </div>

            <p className="text-xs font-semibold text-gray-500 mb-2">Items</p>
            <div className="space-y-2">
              {(selected.items || []).map((it, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-[#f7f8fc] rounded-lg px-3 py-2 text-xs"
                >
                  <span className="text-gray-700 truncate max-w-[260px]">
                    {it.product?.title || it.ean || "Item"}
                  </span>
                  <span className="text-gray-500">
                    {it.quantity || 1} × €{it.offerPrice ?? it.unitPrice ?? "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* Customer & Shipping Details */}
            {selected.shipmentDetails && (
              <>
                <p className="text-xs font-semibold text-gray-500 mt-4 mb-2">Customer & Shipping Info</p>
                <div className="bg-[#f7f8fc] rounded-xl px-4 py-3 text-xs text-gray-700 space-y-1">
                  <p><span className="font-semibold text-gray-500">Name:</span> {selected.shipmentDetails.salutation === "MALE" ? "Mr." : selected.shipmentDetails.salutation === "FEMALE" ? "Ms." : ""} {selected.shipmentDetails.firstName} {selected.shipmentDetails.surname}</p>
                  {selected.shipmentDetails.company && <p><span className="font-semibold text-gray-500">Company:</span> {selected.shipmentDetails.company}</p>}
                  {selected.shipmentDetails.email && <p><span className="font-semibold text-gray-500">Email:</span> {selected.shipmentDetails.email}</p>}
                  <p><span className="font-semibold text-gray-500">Address:</span> {selected.shipmentDetails.streetName} {selected.shipmentDetails.houseNumber} {selected.shipmentDetails.houseNumberExtension || ""}</p>
                  <p><span className="font-semibold text-gray-500">Location:</span> {selected.shipmentDetails.zipCode}, {selected.shipmentDetails.city}, {selected.shipmentDetails.countryCode}</p>
                  {selected.shipmentDetails.extraAddressInformation && <p><span className="font-semibold text-gray-500">Extra:</span> {selected.shipmentDetails.extraAddressInformation}</p>}
                </div>
              </>
            )}
            
            {/* Billing Details (if different or notable) */}
            {selected.billingDetails && (
              <>
                <p className="text-xs font-semibold text-gray-500 mt-4 mb-2">Billing Info</p>
                <div className="bg-[#f7f8fc] rounded-xl px-4 py-3 text-xs text-gray-700 space-y-1">
                  <p><span className="font-semibold text-gray-500">Name:</span> {selected.billingDetails.salutation === "MALE" ? "Mr." : selected.billingDetails.salutation === "FEMALE" ? "Ms." : ""} {selected.billingDetails.firstName} {selected.billingDetails.surname}</p>
                  {selected.billingDetails.company && <p><span className="font-semibold text-gray-500">Company:</span> {selected.billingDetails.company}</p>}
                  {selected.billingDetails.vatNumber && <p><span className="font-semibold text-gray-500">VAT Number:</span> {selected.billingDetails.vatNumber}</p>}
                  <p><span className="font-semibold text-gray-500">Address:</span> {selected.billingDetails.streetName} {selected.billingDetails.houseNumber} {selected.billingDetails.houseNumberExtension || ""}</p>
                  <p><span className="font-semibold text-gray-500">Location:</span> {selected.billingDetails.zipCode}, {selected.billingDetails.city}, {selected.billingDetails.countryCode}</p>
                </div>
              </>
            )}

          </div>
        )}
      </Modal>
    </div>
  );
};

const Stat = ({ label, value, positive }) => (
  <div className="bg-[#f7f8fc] rounded-xl px-4 py-3">
    <p className="text-xs text-gray-400">{label}</p>
    <p
      className={`text-base font-bold ${
        positive === undefined ? "text-gray-800" : positive ? "text-green-600" : "text-red-500"
      }`}
    >
      {value}
    </p>
  </div>
);

export default Orders;
