import { Link, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ShiftsPage from "./pages/ShiftsPage";
import LeavePage from "./pages/LeavePage";

function NotFound() {
  return (
    <div className="card empty-state">
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Everything below requires a logged-in user */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
