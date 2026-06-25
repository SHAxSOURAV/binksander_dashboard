import { createBrowserRouter } from "react-router-dom";

import Login from "../Pages/auth/Login";
import Signup from "../Pages/auth/Signup";
import ForgetPassword from "../Pages/auth/ForgetPassword";
import VerifyCode from "../Pages/auth/VerifyCode";
import CreateNewPassword from "../Pages/auth/CreateNewPassword";

import AdminRoute from "../ProtectedRoute/AdminRoute";
import Dashboard from "../Pages/layout/Dashboard";
import ErrorBoundary from "../ErrorBoundary";

import DashboardHome from "../Pages/dashboardHome/DashboardHome";
import Products from "../Pages/products/Products";
import Orders from "../Pages/orders/Orders";
import AmazonOperations from "../Pages/amazonOperations/AmazonOperations";
import RimcoOperations from "../Pages/rimcoOperations/RimcoOperations";

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
      { index: true, element: <DashboardHome /> },
      { path: "/products", element: <Products /> },
      { path: "/orders", element: <Orders /> },
      { path: "/amazon-operations", element: <AmazonOperations /> },
      { path: "/rimco-operations", element: <RimcoOperations /> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forget-password", element: <ForgetPassword /> },
  { path: "/verify-code", element: <VerifyCode /> },
  { path: "/reset-password", element: <CreateNewPassword /> },
]);

export default router;
