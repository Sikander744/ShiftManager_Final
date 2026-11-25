/**
 * Authentication state for the whole app (React Context).
 * Stores the JWT + basic user info in localStorage so the user stays
 * signed in after a reload and the app can open while offline.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/services";
import { tokenStorage } from "../api/client";
import { clearUserData } from "../utils/offlineStore";
import { disablePush } from "../services/pushService";
import { AuthContext } from "./useAuth";

const USER_KEY = "sm_user";


function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && tokenStorage.get() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [sessionMessage, setSessionMessage] = useState("");

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email.trim(), password);
    tokenStorage.set(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setSessionMessage("");
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    (name, email, password) => authApi.register(name.trim(), email.trim(), password),
    []
  );

  const logout = useCallback(async (message = "") => {
    const current = readStoredUser();
    // Stop push messages for this user on this browser, then wipe their offline data
    try {
      await disablePush();
    } catch {
      /* ignore - logout must always succeed */
    }
    if (current?.id) await clearUserData(current.id);
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    setSessionMessage(message);
    setUser(null);
  }, []);

  // The API client fires this event when the server answers 401 (expired token)
  useEffect(() => {
    const handler = (event) => logout(event.detail || "Your session has expired. Please sign in again.");
    window.addEventListener("sm:unauthorized", handler);
    return () => window.removeEventListener("sm:unauthorized", handler);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      isManager: user?.role === "manager",
      isEmployee: user?.role === "employee",
      login,
      register,
      logout,
      sessionMessage
    }),
    [user, login, register, logout, sessionMessage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

