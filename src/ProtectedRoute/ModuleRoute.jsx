import { Navigate } from "react-router-dom";
import { getUser } from "../utils/session";

const ModuleRoute = ({ module, children }) => {
  const user = getUser();
  const isOwnerOrAdmin =
    !user?.owner_id ||
    ["manager", "admin", "seller"].includes(user?.role);

  if (!isOwnerOrAdmin && module) {
    const permissions = user?.permissions || [];
    if (!permissions.includes(module)) {
      // User does not have access to this module, redirect to first allowed route or /
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ModuleRoute;
