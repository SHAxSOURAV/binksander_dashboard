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

import DashboardHome from "../Pages/dashboardHome/DashboardHome";
import Products from "../Pages/products/Products";
import Orders from "../Pages/orders/Orders";
import AmazonOperations from "../Pages/amazonOperations/AmazonOperations";
import RimcoOperations from "../Pages/rimcoOperations/RimcoOperations";
import BolListing from "../Pages/bolListing/BolListing";
import AmazonAffiliateAccounts from "../Pages/amazonAffiliateAccounts/AmazonAffiliateAccounts";
import AmazonLookup from "../Pages/amazonLookup/AmazonLookup";
import NeedsReview from "../Pages/needsReview/NeedsReview";
import LowStockAlerts from "../Pages/lowStock/LowStockAlerts";

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
            <DashboardHome />
          </ModuleRoute>
        ),
      },
      {
        path: "/products",
        element: (
          <ModuleRoute module="inventory">
            <Products />
          </ModuleRoute>
        ),
      },
      {
        path: "/bol-listings",
        element: (
          <ModuleRoute module="offers">
            <BolListing />
          </ModuleRoute>
        ),
      },
      {
        path: "/orders",
        element: (
          <ModuleRoute module="sales">
            <Orders />
          </ModuleRoute>
        ),
      },
      {
        path: "/amazon-operations",
        element: (
          <ModuleRoute module="sourcing">
            <AmazonOperations />
          </ModuleRoute>
        ),
      },
      {
        path: "/rimco-operations",
        element: (
          <ModuleRoute module="rimco">
            <RimcoOperations />
          </ModuleRoute>
        ),
      },
      { path: "/amazon-affiliates", element: <AmazonAffiliateAccounts /> },
      { path: "/amazon-lookup", element: <AmazonLookup /> },
      {
        path: "/needs-review",
        element: (
          <ModuleRoute module="needs_review">
            <NeedsReview />
          </ModuleRoute>
        ),
      },
      { path: "/low-stock", element: <LowStockAlerts /> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forget-password", element: <ForgetPassword /> },
  { path: "/verify-code", element: <VerifyCode /> },
  { path: "/reset-password", element: <CreateNewPassword /> },
]);

export default router;
