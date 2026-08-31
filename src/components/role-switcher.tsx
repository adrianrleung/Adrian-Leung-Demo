"use client";

import { useRouter } from "next/navigation";
import { DEMO_USERS, type User } from "@/platform/users";

/**
 * Prototype-only. Stands in for Entra ID sign-in so permission behaviour can
 * be demonstrated without a live tenant.
 */
export function RoleSwitcher({ user }: { user: User }) {
  const router = useRouter();
  const keys = Object.keys(DEMO_USERS);
  const currentKey = keys.find((key) => DEMO_USERS[key].id === user.id) ?? keys[0];

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      Signed in as
      <select
        value={currentKey}
        onChange={(event) => {
          document.cookie = `demo-user=${event.target.value}; path=/`;
          router.refresh();
        }}
        className="rounded-md border border-slate-300 px-2 py-1 text-slate-900"
      >
        {keys.map((key) => (
          <option key={key} value={key}>
            {DEMO_USERS[key].name} ({DEMO_USERS[key].roles.join(", ")})
          </option>
        ))}
      </select>
    </label>
  );
}
