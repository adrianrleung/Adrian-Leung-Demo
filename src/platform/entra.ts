import type { User } from "./users";

/**
 * Pure Entra ID claim handling, kept separate from the NextAuth wiring so the
 * group→role mapping is unit-testable without a tenant.
 */

/**
 * Parses ENTRA_GROUP_ROLE_MAP, a JSON object of Entra group object IDs to
 * platform role names, e.g. {"a1b2...":"finance-lead","c3d4...":"support-agent"}.
 */
export function parseGroupRoleMap(raw: string): Record<string, string> {
  if (!raw.trim()) return {};
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("ENTRA_GROUP_ROLE_MAP must be a JSON object of groupId -> role");
  }
  const map: Record<string, string> = {};
  for (const [group, role] of Object.entries(parsed)) {
    if (typeof role !== "string") {
      throw new Error(`ENTRA_GROUP_ROLE_MAP: role for group "${group}" must be a string`);
    }
    map[group] = role;
  }
  return map;
}

/** Maps the token's group claims to platform roles; unknown groups are ignored. */
export function rolesFromGroups(
  groups: readonly string[],
  map: Record<string, string>,
): string[] {
  const roles = new Set<string>();
  for (const group of groups) {
    const role = map[group];
    if (role) roles.add(role);
  }
  return [...roles];
}

export interface EntraClaims {
  /** Entra object id — stable per user per tenant. */
  oid?: string;
  sub: string;
  name?: string;
  preferred_username?: string;
  groups?: readonly string[];
}

export function claimsToUser(
  claims: EntraClaims,
  map: Record<string, string>,
): User {
  return {
    id: claims.oid ?? claims.sub,
    name: claims.name ?? claims.preferred_username ?? "Unknown user",
    roles: rolesFromGroups(claims.groups ?? [], map),
  };
}
