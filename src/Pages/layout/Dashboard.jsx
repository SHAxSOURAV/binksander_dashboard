import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Sidebar from "./Shared/Sidebar";
import Navbar from "./Shared/Navbar";
import { UIProvider } from "../../Provider/ContextProvider";
import SettingsModal from "../../components/settings/SettingsModal";
import ConfirmLogout from "../../components/shared/ConfirmLogout";
import ContactSupportModal from "../../components/support/ContactSupportModal";
import ComponentErrorBoundary from "../../components/shared/ComponentErrorBoundary";
import { useDispatch } from "react-redux";
import { baseApis } from "../../Redux/main/baseApis";
import { getToken } from "../../utils/session";
import { url as API_URL } from "../../Redux/main/server";

const Dashboard = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Connect to Server-Sent Events stream
    const eventSource = new EventSource(`${API_URL}/events/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      if (!event.data) return;

      // Handle JSON payload events (e.g. LOW_STOCK_ALERT)
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.event === "LOW_STOCK_ALERT") {
          const item = parsed.data || {};
          dispatch(baseApis.util.invalidateTags(["StockAlerts", "Notifications", "Products"]));

          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-enter opacity-100" : "animate-leave opacity-0"
                } max-w-sm w-full bg-white shadow-xl rounded-xl pointer-events-auto flex ring-1 ring-black/5 border-l-4 border-amber-500 p-3.5 transition-all duration-300`}
              >
                <div className="flex-1 w-0">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5 text-base">
                      ⚠️
                    </div>
                    <div className="ml-2.5 flex-1">
                      <p className="text-xs font-bold text-gray-900">
                        {item.title || "Low Stock Alert"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                        {item.message || `Product ${item.asin} has gone into low stock.`}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Stock: {item.stock_quantity ?? 0}
                        </span>
                        {item.asin && (
                          <button
                            onClick={() => {
                              toast.dismiss(t.id);
                              navigate(`/low-stock?search=${encodeURIComponent(item.asin)}`);
                            }}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View in Alerts &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-100 pl-2 ml-2">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="flex items-center justify-center text-xs font-medium text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ),
            { duration: 6000, position: "top-right" }
          );
          return;
        }
      } catch (err) {
        // Plain string event fallback
      }

      if (event.data === "SPREADSHEET_UPDATED") {
        // Trigger silent re-fetch of the product and stock alert tables
        dispatch(baseApis.util.invalidateTags(["Products", "StockAlerts", "Notifications"]));
      } else if (event.data === "BOL_OFFERS_UPDATED") {
        dispatch(baseApis.util.invalidateTags(["BolOffers"]));
      }
    };

    return () => {
      eventSource.close();
    };
  }, [dispatch, navigate]);

  return (
    <UIProvider>
      <div className="flex h-screen overflow-hidden bg-[#f7f7f8] font-poppins">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-[216px] flex-shrink-0 border-r border-gray-100">
          <Sidebar />
        </aside>

        {/* Sidebar — mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-[216px] bg-white shadow-xl">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 px-3 sm:px-5 py-4">
          <Navbar onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto thin-scrollbar pb-4">
            <ComponentErrorBoundary>
              <Outlet />
            </ComponentErrorBoundary>
          </main>
        </div>

        <SettingsModal />
        <ConfirmLogout />
        <ContactSupportModal />
      </div>
    </UIProvider>
  );
};

export default Dashboard;
