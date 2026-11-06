import type { LocationQuery, RouteLocationRaw } from "vue-router";
import type { Session } from "@/auth/session";

export type Access = "guest" | "authenticated";

const HOME = "/";

/** Where a visitor with `session` must go instead of `to`, or `null` to let them through. */
export function resolveRedirect(
  access: Access,
  session: Session,
  to: { fullPath: string; query: LocationQuery },
): RouteLocationRaw | null {
  if (session.status === "unknown") return null;
  if (access === "authenticated" && session.status === "anonymous") {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  if (access === "guest" && session.status === "authenticated") {
    return safeRedirect(to.query.redirect) ?? HOME;
  }
  return null;
}

/** Only same-app paths, so `?redirect=` can't send someone to another site. */
function safeRedirect(value: LocationQuery[string]): string | null {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : null;
}
