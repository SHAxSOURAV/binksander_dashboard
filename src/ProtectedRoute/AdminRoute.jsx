import { Navigate } from "react-router-dom";
import { getToken } from "../utils/session";

const AdminRoute = ({ children }) => {
  if (!getToken()) return <Navigate to="/login" />;
  return children;
};

export default AdminRoute;
