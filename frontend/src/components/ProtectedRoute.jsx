import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

/**
 * Route guard.
 * - Not logged in -> redirect to /login
 * - Wrong role    -> redirect to the dashboard
 * NOTE: this only hides pages in the UI. Real protection is enforced by the
 * backend, which checks the JWT and role on every request.
 */
export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
