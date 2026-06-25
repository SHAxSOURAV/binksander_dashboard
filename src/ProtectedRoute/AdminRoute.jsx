import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  if (!localStorage.getItem("token")) return <Navigate to="/login" />;
  return children;
};

export default AdminRoute;
