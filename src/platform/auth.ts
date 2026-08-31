import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { entraUser } from "./auth-entra";
import { DEFAULT_ROLE_KEY, DEMO_USERS, type User } from "./users";

export { DEMO_USERS, hasRole } from "./users";
export type { User } from "./users";

/**
 * AUTH_MODE=entra uses real Entra ID sign-in (see auth-entra.ts).
 * Anything else falls back to the demo role switcher.
 */
export const AUTH_MODE = process.env.AUTH_MODE === "entra" ? "entra" : "demo";

/** Resolves the request's user. */
export async function currentUser(): Promise<User> {
  if (AUTH_MODE === "entra") {
    const user = await entraUser();
    if (!user) redirect("/api/auth/signin");
    return user;
  }
  const store = await cookies();
  const key = store.get("demo-user")?.value ?? DEFAULT_ROLE_KEY;
  return DEMO_USERS[key] ?? DEMO_USERS[DEFAULT_ROLE_KEY];
}
