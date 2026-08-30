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
      <div className="px-5 py-5">
        <Logo />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-300 px-3 mb-1.5">
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
              className="group flex items-center gap-2.5 px-3 py-2 rounded my-0.5 text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span className="text-gray-400 group-hover:text-gray-600 shrink-0">{item.icon}</span>
              <span className="leading-tight">{item.name}</span>
            </a>
          ) : (
            <NavLink
              to={item.link}
              key={index}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 px-3 py-2 rounded my-0.5 text-[13px] font-medium transition-colors ${isActive
                  ? "text-white bg-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`}>
                    {item.icon}
                  </span>
                  <span className="leading-tight">{item.name}</span>
                </>
              )}
            </NavLink>
          )
        )}
      </nav>


    </div>
  );
};

export default Sidebar;
