import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, Input, Select } from "antd";
import { FiSearch, FiSettings, FiLogOut, FiBell, FiAlertTriangle, FiTrash2, FiCheck } from "react-icons/fi";
import { HiMenuAlt2 } from "react-icons/hi";
import { useUI } from "../../../Provider/ContextProvider";
import { getUser } from "../../../utils/session";
import { useGetProfileQuery } from "../../../Redux/profileApis";
import { useGetBolCredentialsQuery } from "../../../Redux/connectionApis";
import { useDispatch } from "react-redux";
import { baseApis } from "../../../Redux/main/baseApis";
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
} from "../../../Redux/notificationApis";

const AVATAR = "/Deafult Profile/profile.webp";

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
};

const Navbar = ({ onMenuClick }) => {
  const { openSettings, setLogoutOpen, activeBolAccountId, setActiveBolAccountId } = useUI();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Live profile from the cache (kept fresh after edits) with a localStorage fallback.
  const { data: profile } = useGetProfileQuery();
  const user = profile || getUser();
  const avatarSrc = user?.profile_picture || AVATAR;

  const { data: bolAccounts = [] } = useGetBolCredentialsQuery();

  // Notifications
  const { data: notifData, isLoading: loadingNotifs } = useGetNotificationsQuery({ limit: 15 });
  const [markRead] = useMarkNotificationAsReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotif] = useDeleteNotificationMutation();

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unread_count || 0;

  useEffect(() => {
    if (bolAccounts.length > 0) {
      if (!activeBolAccountId || !bolAccounts.find(a => a.account_id === activeBolAccountId)) {
        setActiveBolAccountId(bolAccounts[0].account_id);
      }
    }
  }, [bolAccounts, activeBolAccountId, setActiveBolAccountId]);

  const handleAccountChange = (val) => {
    setActiveBolAccountId(val);
    dispatch(baseApis.util.invalidateTags(["Products", "BolOffers", "Analytics", "Orders", "Fulfillment", "Drafts"]));
  };

  // Run a product search → land on the Products page with the term in the URL.
  const submitSearch = () => {
    const term = query.trim();
    if (!term) return;
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markRead(notif.id).unwrap();
      } catch (err) {
        // silent
      }
    }
    setNotifOpen(false);
    if (notif.asin) {
      navigate(`/low-stock?search=${encodeURIComponent(notif.asin)}`);
    } else {
      navigate("/low-stock");
    }
  };

  const handleMarkAllRead = async (e) => {
    e?.stopPropagation();
    try {
      await markAllRead().unwrap();
    } catch (err) {
      // silent
    }
  };

  const handleDeleteNotif = async (e, id) => {
    e?.stopPropagation();
    try {
      await deleteNotif(id).unwrap();
    } catch (err) {
      // silent
    }
  };

  const NotificationCard = (
    <div className="w-80 sm:w-96 font-poppins -m-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <FiCheck size={12} /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 thin-scrollbar">
        {loadingNotifs ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2">
              <FiBell size={18} />
            </div>
            <p className="text-xs font-semibold text-gray-700">No notifications</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              All monitored products currently have adequate stock.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotifClick(n)}
              className={`p-3 flex items-start gap-3 transition-colors cursor-pointer group ${
                !n.is_read ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-gray-50"
              }`}
            >
              {n.image ? (
                <img
                  src={n.image}
                  alt=""
                  className="w-10 h-10 rounded object-cover border border-gray-100 shrink-0 mt-0.5"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FiAlertTriangle size={18} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {n.title || "Low Stock Alert"}
                  </p>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                    {formatTimeAgo(n.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5 leading-relaxed">
                  {n.message}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {n.asin && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      {n.asin}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      (n.stock_quantity ?? 0) <= 0
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    Stock: {n.stock_quantity ?? 0}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-blue-600" title="Unread" />
                )}
                <button
                  onClick={(e) => handleDeleteNotif(e, n.id)}
                  title="Delete notification"
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 transition-opacity p-0.5"
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 rounded-b-lg text-center">
        <button
          onClick={() => {
            setNotifOpen(false);
            navigate("/low-stock");
          }}
          className="text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          View all low stock alerts &rarr;
        </button>
      </div>
    </div>
  );

  const ProfileCard = (
    <div className="w-64 font-poppins p-2">
      <div className="flex items-center gap-3 px-3 py-3">
        <img
          src={avatarSrc}
          alt="profile"
          className="w-11 h-11 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {user?.full_name || "Admin"}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {user?.email || ""}
          </p>
        </div>
      </div>
      <div className="h-px bg-gray-100 my-1" />
      <button
        onClick={() => {
          setProfileOpen(false);
          openSettings("account");
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
      >
        <FiSettings size={17} /> Settings
      </button>
      <button
        onClick={() => {
          setProfileOpen(false);
          setLogoutOpen(true);
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
      >
        <FiLogOut size={17} /> Sign out
      </button>
    </div>
  );

  return (
    <div className="flex items-center justify-between bg-white rounded-xl px-4 sm:px-6 py-4 mb-5 card-shadow">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-600 p-1"
          aria-label="Open menu"
        >
          <HiMenuAlt2 size={24} />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            Hello, {user?.full_name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
            Check &amp; maintains your dashboard
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3">
        {bolAccounts.length > 0 && (
          <Select
            value={activeBolAccountId}
            onChange={handleAccountChange}
            options={bolAccounts.map((a) => ({ label: a.account_name, value: a.account_id }))}
            className="w-32 sm:w-48"
            placeholder="Select Account"
            popupMatchSelectWidth={false}
          />
        )}
        {searchOpen && (
          <Input
            allowClear
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPressEnter={submitSearch}
            prefix={<FiSearch className="text-gray-400" />}
            placeholder="Search products..."
            className="h-9 rounded-full w-40 sm:w-56 hidden sm:flex"
          />
        )}

        <button
          onClick={() => {
            if (searchOpen) submitSearch();
            else setSearchOpen(true);
          }}
          title="Search products"
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-400 transition"
        >
          <FiSearch size={18} />
        </button>

        {/* Notification Bell */}
        <Popover
          content={NotificationCard}
          trigger="click"
          placement="bottomRight"
          open={notifOpen}
          onOpenChange={setNotifOpen}
        >
          <button
            title="Notifications"
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-400 transition relative"
          >
            <FiBell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </Popover>

        {/* Profile Card */}
        <Popover
          content={ProfileCard}
          trigger="click"
          placement="bottomRight"
          open={profileOpen}
          onOpenChange={setProfileOpen}
        >
          <button className="ml-1">
            <img
              src={avatarSrc}
              alt="profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
            />
          </button>
        </Popover>
      </div>
    </div>
  );
};

export default Navbar;
