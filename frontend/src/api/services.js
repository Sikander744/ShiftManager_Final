/**
 * API service modules - one object per backend resource.
 * Components call these functions instead of using fetch directly.
 */
import { apiRequest } from "./client";

const toQuery = (params = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : "";
};

export const authApi = {
  login: (email, password) =>
    apiRequest("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  register: (name, email, password) =>
    apiRequest("/auth/register", { method: "POST", body: { name, email, password }, auth: false }),
  me: () => apiRequest("/auth/me")
};

export const shiftApi = {
  list: (filters) => apiRequest(`/shifts${toQuery(filters)}`),
  get: (id) => apiRequest(`/shifts/${id}`),
  create: (shift) => apiRequest("/shifts", { method: "POST", body: shift }),
  update: (id, changes) => apiRequest(`/shifts/${id}`, { method: "PUT", body: changes }),
  remove: (id) => apiRequest(`/shifts/${id}`, { method: "DELETE" })
};

export const leaveApi = {
  list: (filters) => apiRequest(`/leaves${toQuery(filters)}`),
  get: (id) => apiRequest(`/leaves/${id}`),
  create: (leave) => apiRequest("/leaves", { method: "POST", body: leave }),
  update: (id, changes) => apiRequest(`/leaves/${id}`, { method: "PUT", body: changes }),
  cancel: (id) => apiRequest(`/leaves/${id}`, { method: "DELETE" }),
  review: (id, status) => apiRequest(`/leaves/${id}/status`, { method: "PATCH", body: { status } })
};

export const userApi = {
  employees: () => apiRequest("/users/employees"),
  stats: () => apiRequest("/users/stats")
};

export const notificationApi = {
  publicKey: () => apiRequest("/notifications/public-key", { auth: false }),
  subscribe: (subscription) =>
    apiRequest("/notifications/subscribe", { method: "POST", body: subscription }),
  unsubscribe: (endpoint) =>
    apiRequest("/notifications/subscribe", { method: "DELETE", body: { endpoint } }),
  test: (userId) => apiRequest("/notifications/test", { method: "POST", body: userId ? { userId } : {} })
};
