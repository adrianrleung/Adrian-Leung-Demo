import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_ROLE_KEY, DEMO_USERS, type User } from "./users";

export { DEMO_USERS, hasRole } from "./users";
export type { User } from "./users";

/** Resolves the request's user. Replaced by an OIDC session in production. */
export async function currentUser(): Promise<User> {
  const store = await cookies();
  const key = store.get("demo-user")?.value ?? DEFAULT_ROLE_KEY;
  return DEMO_USERS[key] ?? DEMO_USERS[DEFAULT_ROLE_KEY];
}
