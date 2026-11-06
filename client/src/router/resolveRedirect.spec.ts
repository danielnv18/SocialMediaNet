import { describe, expect, it } from "vite-plus/test";
import type { Session } from "@/auth/session";
import { resolveRedirect } from "./resolveRedirect";

const unknown: Session = { status: "unknown" };
const anonymous: Session = { status: "anonymous" };
const authenticated: Session = {
  status: "authenticated",
  user: { id: "1", userName: "dnoyola", email: "dnoyola@example.com" },
};

const at = (fullPath: string, query: Record<string, string | string[]> = {}) => ({
  fullPath,
  query,
});

describe("resolveRedirect", () => {
  it("sends an anonymous visitor on an authenticated route to login, remembering where they were", () => {
    expect(resolveRedirect("authenticated", anonymous, at("/settings?tab=profile"))).toEqual({
      path: "/login",
      query: { redirect: "/settings?tab=profile" },
    });
  });

  it("lets a signed-in user onto an authenticated route", () => {
    expect(resolveRedirect("authenticated", authenticated, at("/"))).toBeNull();
  });

  it("lets an anonymous visitor onto a guest route", () => {
    expect(resolveRedirect("guest", anonymous, at("/login"))).toBeNull();
  });

  it("sends a signed-in user on a guest route home", () => {
    expect(resolveRedirect("guest", authenticated, at("/register"))).toBe("/");
  });

  it("sends a signed-in user on a guest route to the requested redirect", () => {
    expect(
      resolveRedirect(
        "guest",
        authenticated,
        at("/login?redirect=/settings", { redirect: "/settings" }),
      ),
    ).toBe("/settings");
  });

  it.each(["https://evil.example", "//evil.example", "settings"])(
    "ignores an off-site or relative redirect (%s)",
    (redirect) => {
      expect(resolveRedirect("guest", authenticated, at("/login", { redirect }))).toBe("/");
    },
  );

  it("ignores a repeated redirect parameter", () => {
    expect(resolveRedirect("guest", authenticated, at("/login", { redirect: ["/a", "/b"] }))).toBe(
      "/",
    );
  });

  it("never redirects before the session is known", () => {
    expect(resolveRedirect("authenticated", unknown, at("/"))).toBeNull();
    expect(resolveRedirect("guest", unknown, at("/login"))).toBeNull();
  });
});
