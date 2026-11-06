import { computed, shallowRef } from "vue";
import { z } from "zod";
import { ApiError, get, post, setUnauthorizedHandler } from "@/lib/api";

const userSchema = z.object({
  id: z.string(),
  userName: z.string(),
  email: z.string(),
});

export type User = z.infer<typeof userSchema>;

export type Session =
  | { status: "unknown" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User };

const ANONYMOUS: Session = { status: "anonymous" };

const session = shallowRef<Session>({ status: "unknown" });
const sessionView = computed(() => session.value);

setUnauthorizedHandler(() => {
  if (session.value.status === "authenticated") session.value = ANONYMOUS;
});

export function useSession() {
  return sessionView;
}

function authenticate(body: unknown): User {
  const user = userSchema.parse(body);
  session.value = { status: "authenticated", user };
  return user;
}

let loading: Promise<void> | undefined;

async function resolveSession() {
  try {
    authenticate(await get("/api/auth/me"));
  } catch (error) {
    // A 401 or an unreachable server both leave the UI with nobody signed in.
    if (!(error instanceof ApiError)) throw error;
    session.value = ANONYMOUS;
  }
}

/** Resolves the session from the cookie. Only the first call hits the API. */
export function load(): Promise<void> {
  loading ??= resolveSession();
  return loading;
}

export async function login(input: { login: string; password: string }): Promise<User> {
  return authenticate(await post("/api/auth/login", input));
}

export async function register(input: {
  userName: string;
  email: string;
  password: string;
}): Promise<User> {
  return authenticate(await post("/api/auth/register", input));
}

export async function logout(): Promise<void> {
  await post("/api/auth/logout");
  session.value = ANONYMOUS;
}

export async function forgotPassword(input: { email: string }): Promise<void> {
  await post("/api/auth/forgot-password", input);
}

export async function resetPassword(input: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<void> {
  await post("/api/auth/reset-password", input);
}
