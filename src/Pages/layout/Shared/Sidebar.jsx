import { NavLink } from "react-router-dom";
import {
  MdOutlineDashboard,
  MdOutlineInventory2,
  MdOutlineLocalOffer,
  MdOutlineShoppingCart,
  MdOutlineRateReview,
  MdOutlineAssignmentReturn,
} from "react-icons/md";
import { TbBrandAmazon } from "react-icons/tb";
import { LuTruck } from "react-icons/lu";
import Logo from "../../../components/shared/Logo";

const menuItems = [
  { name: "Overview", link: "/", icon: <MdOutlineDashboard size={20} />, end: true },
  { name: "Inventory Catalog", link: "/products", icon: <MdOutlineInventory2 size={20} /> },
  { name: "Needs Review", link: "/needs-review", icon: <MdOutlineRateReview size={20} /> },
  { name: "Bol.com Offers", link: "/bol-listings", icon: <MdOutlineLocalOffer size={20} /> },
  { name: "Sales & Orders", link: "/orders", icon: <MdOutlineShoppingCart size={20} /> },
  {
    name: "Amazon Sourcing",
    link: "/amazon-operations",
    icon: <TbBrandAmazon size={20} />,
  },
  // {
  //   name: "Amazon Lookup",
  //   link: "/amazon-lookup",
  //   icon: <TbBrandAmazon size={20} />,
  // },
  // {
  //   name: "Affiliate Config",
  //   link: "/amazon-affiliates",
  //   icon: <TbBrandAmazon size={20} />,
  // },
  {
    name: "Rimco Logistics",
    link: "/rimco-operations",
    icon: <LuTruck size={20} />,
  },
  {
    name: "Amazon Return Dashboard",
    link: "https://amazon-dashbaord.vercel.app",
    icon: <MdOutlineAssignmentReturn size={20} />,
    isExternal: true,
  }
];

const Sidebar = ({ onNavigate }) => {
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
        {menuItems.map((item, index) =>
          item.isExternal ? (
            <a
              href={item.link}
              key={index}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavigate}
              className="group relative flex items-center gap-3 px-4 py-3 rounded-xl my-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all duration-150"
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </a>
          ) : (
            <NavLink
              to={item.link}
              key={index}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-4 py-3 rounded-xl my-1 text-sm font-medium transition-all duration-150 ${isActive
                  ? "text-white bg-gray-900 shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </NavLink>
          )
        )}
      </nav>


    </div>
  );
};

export default Sidebar;
