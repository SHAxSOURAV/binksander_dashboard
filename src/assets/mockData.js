// ---------------------------------------------------------------------------
// Frontend mock data. Replace with RTK Query hooks during backend integration.
// ---------------------------------------------------------------------------

export const dashboardStats = {
  totalRevenue: 130450,
  netIncome: 30152,
  totalOrderRequest: 19600,
  totalCompletedOrder: 19600,
  donut: {
    total: 12650,
    completed: 12000,
    canceled: 650,
  },
  today: {
    orders: 700,
    completed: 432,
  },
};

export const recentOrders = [
  { id: 1, name: "Ronald Richards" },
  { id: 2, name: "Cameron Williamson" },
  { id: 3, name: "Guy Hawkins" },
  { id: 4, name: "Kathryn Murphy" },
  { id: 5, name: "Annette Black" },
];

export const connections = {
  inventory: "http://192.168.20.124:5000/",
  google: "http://192.168.20.124:5000/",
  amazonProfile: "http://192.168.20.124:5000/",
  bolProfile: "http://192.168.20.124:5000/",
};

const sampleImg =
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80";

export const products = Array.from({ length: 24 }).map((_, i) => {
  const titles = [
    "iPad Pro 2017 Model",
    "GoPro HERO10 Black",
    "iPhone 17 Pro",
    "SONY Walkman ZX Series NW-ZX707",
    "SONY 1000X THE COLLEXION Wireless Noise",
    "SONY WF-1000XM6 Truly Wireless Noise Cancel",
  ];
  const cats = [
    "Computer & Electronics",
    "Sports",
    "Clothing",
    "Home & Garden",
    "Health & Beauty",
    "Toys & Games",
  ];
  const prices = [899, 349, 899, 1199, 549, 309];
  return {
    id: i + 1,
    asin: `B0F${(100000 + i).toString().slice(-6)}`,
    title: titles[i % titles.length],
    brand: ["Apple", "GoPro", "Apple", "Sony", "Sony", "Sony"][i % 6],
    category: cats[i % cats.length],
    subcategory: ["MP3 Player", "Audio", "Mobile"][i % 3],
    amazonPrice: prices[i % prices.length] + 10,
    price: prices[i % prices.length],
    rating: 4.8,
    reviews: 312,
    image: sampleImg,
    lastUpdated: "24 May, 2020",
    published: i % 3 === 0,
    description:
      "High quality product imported from the connected inventory sheet. Edit price and details before publishing.",
  };
});

const statuses = ["Pending", "Accepted", "Canceled"];
const payBy = ["Cash", "Online"];

export const orders = Array.from({ length: 16 }).map((_, i) => ({
  id: `OID-${133913473 + i}`,
  productName: [
    "Popcorn Seasoning",
    "Teriyaki Sauce",
    "Sesame Oil",
    "Secret Stadium Sauce",
    "Nutella",
    "Magnetic Paper Clip",
    "Doritos",
    "White Pepper",
  ][i % 8],
  price: 10.5,
  payBy: payBy[i % 2],
  customerName: [
    "Dianne Russell",
    "Eleanor Pena",
    "Ralph Edwards",
    "Esther Howard",
    "Brooklyn Simmons",
    "Ronald Richards",
    "Devon Lane",
    "Floyd Miles",
  ][i % 8],
  customerEmail: "customer@example.com",
  orderTime: "Dec 4, 2019 21:42",
  status: statuses[i % 3],
}));

export const orderDetail = {
  id: "OID-133913473",
  date: "Dec 4, 2019 21:42",
  products: [
    { name: "Brewberry Latte", unitPrice: 20, qty: 20, total: 20 },
    { name: "Brewberry Latte", unitPrice: 20, qty: 20, total: 20 },
  ],
  billing: {
    name: "Jane Cooper",
    email: "janecooper@mail.com",
    address: "amsterdam 12 E7",
    postalCode: "1012 JS",
    city: "Amsterdam",
  },
  delivery: {
    name: "Jane Cooper",
    email: "janecooper@mail.com",
    address: "amsterdam 12 E7",
    postalCode: "1012 JS",
    city: "Amsterdam",
  },
  customer: {
    name: "Jane Cooper",
    email: "michael.info@example.com",
    phone: "0929 555 0309",
  },
};

const amazonStatuses = [
  "Order Placed",
  "Picking",
  "Packing",
  "Out for Delivery",
  "Delivered",
  "In Transit",
];

export const amazonOperations = Array.from({ length: 13 }).map((_, i) => ({
  id: `000${982531 + i}`,
  productName: [
    "Popcorn Seasoning",
    "Teriyaki Sauce",
    "Sesame Oil",
    "Secret Stadium Sauce",
    "Nutella",
    "Magnetic Paper Clip",
  ][i % 6],
  price: 10.5,
  payBy: payBy[i % 2],
  customerName: ["Dianne Russell", "Eleanor Pena", "Ralph Edwards"][i % 3],
  orderTime: "Dec 4, 2019 21:42",
  status: amazonStatuses[i % amazonStatuses.length],
}));

export const rimcoOperations = amazonOperations.map((o, i) => ({
  ...o,
  id: `000${982531 + i}`,
  status: amazonStatuses[(i + 2) % amazonStatuses.length],
}));

// Tracking pipelines per source — used by the tracking stepper.
// `colors` gives each status its own distinct colour.
export const trackingFlows = {
  bol: {
    label: "Bol.com",
    color: "#1B17E0",
    steps: ["Bol.com", "Accepted", "Processing", "Shipped", "Amazon"],
    colors: ["#1B17E0", "#16A34A", "#F59E0B", "#7C3AED", "#0EA5E9"],
  },
  amazon: {
    label: "Amazon",
    color: "#F59E0B",
    steps: ["Amazon", "Accepted", "Processing", "Shipped", "Amazon"],
    colors: ["#F59E0B", "#16A34A", "#7C3AED", "#0EA5E9", "#EF4444"],
  },
  rimco: {
    label: "RIMCO",
    color: "#EF4444",
    steps: ["RIMCO", "Accepted", "Processing", "Shipped", "Customer"],
    colors: ["#EF4444", "#16A34A", "#F59E0B", "#7C3AED", "#0EA5E9"],
  },
  // Bol.com → Amazon.nl dropship fulfillment pipeline (live backend).
  fulfillment: {
    label: "Fulfillment",
    color: "#1B17E0",
    steps: ["Received", "Mapped", "Approved", "Purchased", "Completed"],
    colors: ["#1B17E0", "#2563EB", "#7C3AED", "#0891B2", "#16A34A"],
  },
};
