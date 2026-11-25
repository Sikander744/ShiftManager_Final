import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import useOnlineStatus from "../hooks/useOnlineStatus";
import NotificationToggle from "./NotificationToggle";

export default function Layout() {
  const { user, isManager, logout } = useAuth();
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const close = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="brand">
          <img src="/icons/icon-192.png" alt="" width="32" height="32" />
          <span>ShiftManager</span>
        </div>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          ☰ <span className="sr-only">Menu</span>
        </button>

        <nav id="main-nav" className={`nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">
          <NavLink to="/dashboard" onClick={close}>Dashboard</NavLink>
          <NavLink to="/shifts" onClick={close}>{isManager ? "Shift Management" : "My Shifts"}</NavLink>
          <NavLink to="/leave" onClick={close}>{isManager ? "Leave Approvals" : "My Leave"}</NavLink>
          <div className="nav-user">
            <NotificationToggle />
            <span className="user-chip" title={user.email}>
              {user.name} <span className={`role-tag role-${user.role}`}>{user.role}</span>
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </nav>
      </header>

      {!online && (
        <div className="offline-banner" role="status">
          ⚠ You are offline. Showing your last saved data – it will refresh automatically when you reconnect.
        </div>
      )}

      <main id="main" className="container">
        <Outlet />
      </main>

      <footer className="footer">ShiftManager · Employee Shift &amp; Leave Management</footer>
    </div>
  );
}
