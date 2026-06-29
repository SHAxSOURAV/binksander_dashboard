import { NavLink } from "react-router-dom";
import {
  MdOutlineDashboard,
  MdOutlineInventory2,
  MdOutlineShoppingCart,
} from "react-icons/md";
import { TbBrandAmazon } from "react-icons/tb";
import { LuTruck } from "react-icons/lu";
import Logo from "../../../components/shared/Logo";
import { useUI } from "../../../Provider/ContextProvider";

const menuItems = [
  { name: "Overview", link: "/", icon: <MdOutlineDashboard size={20} />, end: true },
  { name: "Inventory Catalog", link: "/products", icon: <MdOutlineInventory2 size={20} /> },
  { name: "Bol.com Offers", link: "/bol-listings", icon: <MdOutlineInventory2 size={20} /> },
  { name: "Sales & Orders", link: "/orders", icon: <MdOutlineShoppingCart size={20} /> },
  {
    name: "Amazon Sourcing",
    link: "/amazon-operations",
    icon: <TbBrandAmazon size={20} />,
  },
  {
    name: "Rimco Logistics",
    link: "/rimco-operations",
    icon: <LuTruck size={20} />,
  },
];

const Sidebar = ({ onNavigate }) => {
  const { setSupportOpen } = useUI();
  return (
    <div className="h-full bg-white flex flex-col font-poppins">
      {/* Logo */}
      <div className="px-8 py-7">
        <Logo />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-300 px-4 mb-2">
          Menu
        </p>
        {menuItems.map((item, index) => (
          <NavLink
            to={item.link}
            key={index}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-4 py-3 rounded-xl my-1 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "text-white bg-brand shadow-[0_8px_20px_rgba(27,23,224,0.28)]"
                  : "text-gray-500 hover:bg-[#f0f0fd] hover:text-brand"
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer card */}
      <div className="m-4 rounded-2xl bg-gradient-to-br from-[#1B17E0] to-[#4B45F0] p-4 text-white">
        <p className="text-sm font-semibold">Need help?</p>
        <p className="text-[11px] text-white/70 mt-0.5 mb-3">
          Check our docs &amp; support center
        </p>
        <button
          onClick={() => {
            onNavigate?.();
            setSupportOpen(true);
          }}
          className="w-full bg-white/15 hover:bg-white/25 transition text-xs font-medium py-2 rounded-lg"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
