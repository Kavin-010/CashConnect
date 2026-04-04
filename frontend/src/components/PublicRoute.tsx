import { Navigate } from "react-router-dom";
import { getToken } from "../lib/apolloClient";

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = getToken();

  if (token) {
    // Already logged in → redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default PublicRoute;