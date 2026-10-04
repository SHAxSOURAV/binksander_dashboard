import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import Login from "../Pages/auth/Login";
import Signup from "../Pages/auth/Signup";
import ForgetPassword from "../Pages/auth/ForgetPassword";
import VerifyCode from "../Pages/auth/VerifyCode";
import CreateNewPassword from "../Pages/auth/CreateNewPassword";

import AdminRoute from "../ProtectedRoute/AdminRoute";
import ModuleRoute from "../ProtectedRoute/ModuleRoute";
import Dashboard from "../Pages/layout/Dashboard";
import ErrorBoundary from "../ErrorBoundary";

// Lazy-loaded page components — each becomes its own chunk, downloaded only
// when the user navigates to that route.  This keeps the initial bundle small.
const DashboardHome = lazy(() => import("../Pages/dashboardHome/DashboardHome"));
const Products = lazy(() => import("../Pages/products/Products"));
const Orders = lazy(() => import("../Pages/orders/Orders"));
const AmazonOperations = lazy(() => import("../Pages/amazonOperations/AmazonOperations"));
const RimcoOperations = lazy(() => import("../Pages/rimcoOperations/RimcoOperations"));
const BolListing = lazy(() => import("../Pages/bolListing/BolListing"));
const AmazonAffiliateAccounts = lazy(() => import("../Pages/amazonAffiliateAccounts/AmazonAffiliateAccounts"));
const AmazonLookup = lazy(() => import("../Pages/amazonLookup/AmazonLookup"));
const NeedsReview = lazy(() => import("../Pages/needsReview/NeedsReview"));
const LowStockAlerts = lazy(() => import("../Pages/lowStock/LowStockAlerts"));

// Minimal full-page spinner shown while a lazy chunk downloads.
const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="w-7 h-7 border-[2.5px] border-gray-200 border-t-gray-800 rounded-full animate-spin" />
  </div>
);

// Wrap a lazy component in Suspense with the shared spinner.
const Lazy = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <ErrorBoundary />,
    element: (
      <AdminRoute>
        <Dashboard />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <ModuleRoute module="overview">
            <Lazy><DashboardHome /></Lazy>
          </ModuleRoute>
        ),
      },
      {
        path: "/products",
        element: (
          <ModuleRoute module="inventory">
            <Lazy><Products /></Lazy>
          </ModuleRoute>
        ),
      },
      {
        path: "/bol-listings",
        element: (
          <ModuleRoute module="offers">
            <Lazy><BolListing /></Lazy>
          </ModuleRoute>
        ),
      },
      {
        path: "/orders",
        element: (
          <ModuleRoute module="sales">
            <Lazy><Orders /></Lazy>
          </ModuleRoute>
        ),
      },
      {
        path: "/amazon-operations",
        element: (
          <ModuleRoute module="sourcing">
            <Lazy><AmazonOperations /></Lazy>
          </ModuleRoute>
        ),
      },
      {
        path: "/rimco-operations",
        element: (
          <ModuleRoute module="rimco">
            <Lazy><RimcoOperations /></Lazy>
          </ModuleRoute>
        ),
      },
      { path: "/amazon-affiliates", element: <Lazy><AmazonAffiliateAccounts /></Lazy> },
      { path: "/amazon-lookup", element: <Lazy><AmazonLookup /></Lazy> },
      {
        path: "/needs-review",
        element: (
          <ModuleRoute module="needs_review">
            <Lazy><NeedsReview /></Lazy>
          </ModuleRoute>
        ),
      },
      { path: "/low-stock", element: <Lazy><LowStockAlerts /></Lazy> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forget-password", element: <ForgetPassword /> },
  { path: "/verify-code", element: <VerifyCode /> },
  { path: "/reset-password", element: <CreateNewPassword /> },
]);

export default router;
