import { afterEach, describe, expect, test, vi } from "vitest";
import { apiRequest, ApiError, tokenStorage } from "../api/client";

const jsonResponse = (status, body) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

afterEach(() => vi.restoreAllMocks());

describe("apiRequest", () => {
  test("adds the Bearer token header when logged in", async () => {
    tokenStorage.set("abc123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(jsonResponse(200, { ok: true }));
    await apiRequest("/shifts");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer abc123");
  });

  test("does not send a token for public requests", async () => {
    tokenStorage.set("abc123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(jsonResponse(200, {}));
    await apiRequest("/auth/login", { method: "POST", body: {}, auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  test("throws ApiError with status and server message on 403", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(jsonResponse(403, { message: "Access denied" }));
    await expect(apiRequest("/shifts", { method: "POST", body: {} })).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      message: "Access denied"
    });
  });

  test("network failure becomes an offline ApiError (status 0)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await apiRequest("/shifts").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.isNetworkError).toBe(true);
  });

  test("401 with a stored token triggers the session-expired event", async () => {
    tokenStorage.set("expired");
    vi.spyOn(globalThis, "fetch").mockReturnValue(jsonResponse(401, { message: "Session expired" }));
    const listener = vi.fn();
    window.addEventListener("sm:unauthorized", listener);
    await apiRequest("/shifts").catch(() => {});
    window.removeEventListener("sm:unauthorized", listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
