import { watch } from "vue";
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { load, useSession } from "@/auth/session";
import { type Access, resolveRedirect } from "./resolveRedirect";

declare module "vue-router" {
  interface RouteMeta {
    access: Access;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("@/pages/HomePage.vue"),
    meta: { access: "authenticated" },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("@/pages/LoginPage.vue"),
    meta: { access: "guest" },
  },
  {
    path: "/register",
    name: "register",
    component: () => import("@/pages/RegisterPage.vue"),
    meta: { access: "guest" },
  },
  {
    path: "/forgot-password",
    name: "forgot-password",
    component: () => import("@/pages/ForgotPasswordPage.vue"),
    meta: { access: "guest" },
  },
  {
    path: "/reset-password",
    name: "reset-password",
    component: () => import("@/pages/ResetPasswordPage.vue"),
    meta: { access: "guest" },
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = createRouter({ history: createWebHistory(), routes });

const session = useSession();

router.beforeEach(async (to) => {
  await load();
  return resolveRedirect(to.meta.access, session.value, to) ?? true;
});

// Signing in or out happens in place, so re-run the same rule against the page the user is on.
void router.isReady().then(() => {
  watch(session, (current) => {
    const route = router.currentRoute.value;
    const target = resolveRedirect(route.meta.access, current, route);
    if (target) void router.replace(target);
  });
});
