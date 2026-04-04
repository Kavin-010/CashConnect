import { Navigate } from "react-router-dom";
import { getToken } from "../lib/apolloClient";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getToken();

  if (!token) {
    // Not logged in → redirect to login
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;