/**
 * Central fetch wrapper for the ShiftManager API.
 * - Adds the JWT "Authorization: Bearer <token>" header automatically
 * - Converts error responses into ApiError objects with status + message
 * - Network failures (offline / server down) become ApiError with status 0
 */
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TOKEN_KEY = "sm_token";

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

export async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = tokenStorage.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError("Cannot reach the server. You may be offline.", 0);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null; // empty or non-JSON body
  }

  if (!response.ok) {
    // Expired/invalid session -> tell the app to log out
    if (response.status === 401 && auth && token) {
      window.dispatchEvent(new CustomEvent("sm:unauthorized", { detail: data?.message }));
    }
    const details = Array.isArray(data?.errors) ? data.errors : [];
    throw new ApiError(data?.message || `Request failed (${response.status})`, response.status, details);
  }

  return data;
}

/** Joins the main message with any validation details for display. */
export function describeError(error) {
  if (!error) return "";
  if (error.errors?.length) return `${error.message}: ${error.errors.join("; ")}`;
  return error.message || "Something went wrong";
}
