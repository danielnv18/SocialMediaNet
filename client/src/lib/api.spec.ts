import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  ApiError,
  get,
  NETWORK_ERROR_STATUS,
  parseApiError,
  post,
  setUnauthorizedHandler,
} from "./api";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(() => {});
});

describe("parseApiError", () => {
  it("maps a ValidationProblem's errors to field errors", async () => {
    const error = await parseApiError(
      json(400, {
        title: "One or more validation errors occurred.",
        errors: {
          userName: ["Username 'dnoyola' is already taken."],
          password: ["Too short.", "Needs a digit."],
        },
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.title).toBe("One or more validation errors occurred.");
    expect(error.detail).toBeUndefined();
    expect(error.fieldErrors).toEqual({
      userName: ["Username 'dnoyola' is already taken."],
      password: ["Too short.", "Needs a digit."],
    });
  });

  it("keeps a ProblemDetails detail and has no field errors", async () => {
    const error = await parseApiError(
      json(401, { title: "Unauthorized", detail: "Invalid username or password." }),
    );

    expect(error.status).toBe(401);
    expect(error.detail).toBe("Invalid username or password.");
    expect(error.message).toBe("Invalid username or password.");
    expect(error.fieldErrors).toEqual({});
  });

  it("falls back to a status title when the body is not JSON", async () => {
    const error = await parseApiError(new Response("Bad Gateway", { status: 502 }));

    expect(error.status).toBe(502);
    expect(error.title).toBe("Request failed with status 502.");
    expect(error.fieldErrors).toEqual({});
  });

  it("drops malformed error entries instead of trusting them", async () => {
    const error = await parseApiError(
      json(400, { title: 7, errors: { email: "not a list", token: ["Expired.", 3] } }),
    );

    expect(error.title).toBe("Request failed with status 400.");
    expect(error.fieldErrors).toEqual({ token: ["Expired."] });
  });
});

describe("get and post", () => {
  it("sends JSON with same-origin credentials and returns the body", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { id: "1" }));
    vi.stubGlobal("fetch", fetch);

    await expect(post("/api/auth/login", { login: "a", password: "b" })).resolves.toEqual({
      id: "1",
    });
    expect(fetch).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "a", password: "b" }),
      credentials: "same-origin",
    });
  });

  it("resolves to undefined for an empty success response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(post("/api/auth/logout")).resolves.toBeUndefined();
  });

  it("rejects with the parsed ApiError on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(429, { title: "Too Many Requests" })));

    await expect(post("/api/auth/login", {})).rejects.toMatchObject({
      status: 429,
      title: "Too Many Requests",
    });
  });

  it("reports a 401 to the unauthorized handler, and nothing else", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json(403, { title: "Forbidden" }))
        .mockResolvedValueOnce(json(401, { title: "Unauthorized" })),
    );

    await expect(get("/api/x")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
    await expect(get("/api/x")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("turns a network failure into an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(get("/api/auth/me")).rejects.toMatchObject({ status: NETWORK_ERROR_STATUS });
  });
});
