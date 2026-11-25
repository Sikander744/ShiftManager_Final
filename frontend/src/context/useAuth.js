import { createContext, useContext } from "react";

/** The authentication context object (provided by <AuthProvider>). */
export const AuthContext = createContext(null);

/** Hook used by components to read the logged-in user and auth actions. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
