import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APIError,
  clearTokens,
  getAccessToken,
  qs,
  request,
  requestList,
  setTokens,
  streamFeed,
} from "./api";

describe("api client", () => {
  afterEach(() => {
    clearTokens();
    vi.unstubAllGlobals();
  });

  it("builds query strings without empty values", () => {
    expect(qs({ page: 2, pageSize: 20, q: "", status: undefined, type: null })).toBe(
      "?page=2&pageSize=20",
    );
  });

  it("migrates legacy localStorage access token into memory", () => {
    window.localStorage.setItem("sentinel.v1.token", "legacy-token");

    expect(getAccessToken()).toBe("legacy-token");
    expect(window.localStorage.getItem("sentinel.v1.token")).toBeNull();
  });

  it("refreshes once after a 401 and retries the original request", async () => {
    setTokens("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "AUTH_TOKEN_EXPIRED", message: "expired" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { accessToken: "fresh-token" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: "u_1", name: "Root" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(request<{ id: string }>("/api/v1/me")).resolves.toEqual({ id: "u_1", name: "Root" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer expired-token" });
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:8080/api/v1/auth/refresh");
    expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({ Authorization: "Bearer fresh-token" });
  });

  it("parses paginated list envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: "a" }], meta: { page: 1, pageSize: 20, total: 1 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(requestList<{ id: string }[]>("/api/v1/blacklist")).resolves.toEqual({
      data: [{ id: "a" }],
      meta: { page: 1, pageSize: 20, total: 1 },
    });
  });

  it("throws APIError with backend error code and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "RBAC_FORBIDDEN", message: "denied" } }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(request("/api/v1/audit")).rejects.toMatchObject({
      code: "RBAC_FORBIDDEN",
      message: "denied",
      status: 403,
    } satisfies Partial<APIError>);
  });

  it("clears access token when refresh is rejected", async () => {
    setTokens("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "AUTH_TOKEN_EXPIRED" } }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "AUTH_TOKEN_REVOKED" } }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/api/v1/me")).rejects.toMatchObject({ status: 401 });
    expect(getAccessToken()).toBeNull();
  });

  it("shares one refresh request across concurrent 401 responses", async () => {
    setTokens("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "AUTH_TOKEN_EXPIRED" } }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "AUTH_TOKEN_EXPIRED" } }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { accessToken: "fresh-token" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "one" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "two" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(Promise.all([request("/api/v1/one"), request("/api/v1/two")])).resolves.toEqual([
      { id: "one" },
      { id: "two" },
    ]);

    const refreshCalls = fetchMock.mock.calls.filter((call) => String(call[0]).endsWith("/api/v1/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("parses SSE feed events and aborts cleanly", async () => {
    const payload = { id: "ev_1", ts: "now", side: "trace", verb: "alert", level: "warn", payload: "{}" };
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`event: feed\ndata: ${JSON.stringify(payload)}\n\n`));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(stream, { status: 200 })),
    );
    const onEvent = vi.fn();
    const onClose = vi.fn();

    streamFeed({ onEvent, onClose });

    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(payload));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
