import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, Input } from "antd";
import {  FiSearch, FiSettings, FiLogOut } from "react-icons/fi";
import { HiMenuAlt2 } from "react-icons/hi";
import { useUI } from "../../../Provider/ContextProvider";
import { getUser } from "../../../utils/session";
import { useGetProfileQuery } from "../../../Redux/profileApis";

const AVATAR =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80";

const Navbar = ({ onMenuClick }) => {
  const { openSettings, setLogoutOpen } = useUI();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Live profile from the cache (kept fresh after edits) with a localStorage fallback.
  const { data: profile } = useGetProfileQuery();
  const user = profile || getUser();
  const avatarSrc = user?.profile_picture || AVATAR;

  // Run a product search → land on the Products page with the term in the URL.
  const submitSearch = () => {
    const term = query.trim();
    if (!term) return;
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

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
          <h1 className="text-base sm:text-lg font-bold text-brand leading-tight">
            Hello, {user?.full_name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
            Check &amp; maintains your dashboard
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3">
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
          className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-500 hover:text-brand hover:border-brand/30 transition"
        >
          <FiSearch size={18} />
        </button>

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
