import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const user = { id: "8f1c", userName: "dnoyola", email: "dnoyola@example.com" };
const respond = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

// The session is module state, so each test gets a fresh copy of the module.
async function freshSession() {
  vi.resetModules();
  return import("./session");
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("session", () => {
  it("loads the signed-in user once, however many callers ask", async () => {
    const fetch = vi.fn().mockResolvedValue(respond(200, user));
    vi.stubGlobal("fetch", fetch);
    const { load, useSession } = await freshSession();

    await Promise.all([load(), load()]);
    await load();

    expect(fetch).toHaveBeenCalledOnce();
    expect(useSession().value).toEqual({ status: "authenticated", user });
  });

  it("is anonymous when /me answers 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(401)));
    const { load, useSession } = await freshSession();

    await load();

    expect(useSession().value).toEqual({ status: "anonymous" });
  });

  it("flips to anonymous when a later call answers 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(respond(200, user)).mockResolvedValueOnce(respond(401)),
    );
    const { load, logout, useSession } = await freshSession();
    await load();

    await expect(logout()).rejects.toMatchObject({ status: 401 });

    expect(useSession().value).toEqual({ status: "anonymous" });
  });

  it("signs in and out", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(respond(401))
        .mockResolvedValueOnce(respond(200, user))
        .mockResolvedValueOnce(respond(204)),
    );
    const { load, login, logout, useSession } = await freshSession();
    await load();

    await login({ login: "dnoyola", password: "P@ssw0rd!" });
    expect(useSession().value).toEqual({ status: "authenticated", user });

    await logout();
    expect(useSession().value).toEqual({ status: "anonymous" });
  });
});
