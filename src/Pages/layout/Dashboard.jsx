import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Shared/Sidebar";
import Navbar from "./Shared/Navbar";
import { UIProvider } from "../../Provider/ContextProvider";
import SettingsModal from "../../components/settings/SettingsModal";
import ConfirmLogout from "../../components/shared/ConfirmLogout";
import ContactSupportModal from "../../components/support/ContactSupportModal";
import { useDispatch } from "react-redux";
import { baseApis } from "../../Redux/main/baseApis";
import { getToken } from "../../utils/session";
import { url as API_URL } from "../../Redux/main/server";

const Dashboard = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Connect to Server-Sent Events stream
    const eventSource = new EventSource(`${API_URL}/events/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      if (event.data === "SPREADSHEET_UPDATED") {
        // Trigger silent re-fetch of the product table
        dispatch(baseApis.util.invalidateTags(["Products"]));
      }
    };

    return () => {
      eventSource.close();
    };
  }, [dispatch]);

  return (
    <UIProvider>
      <div className="flex h-screen overflow-hidden bg-[#f5f6fa] font-poppins">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-[260px] flex-shrink-0 border-r border-gray-100">
          <Sidebar />
        </aside>

        {/* Sidebar — mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-[260px] bg-white shadow-xl">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 px-3 sm:px-5 py-4">
          <Navbar onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto thin-scrollbar pb-4">
            <Outlet />
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
