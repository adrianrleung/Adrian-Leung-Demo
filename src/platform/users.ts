export interface User {
  id: string;
  name: string;
  roles: readonly string[];
}

/**
 * Prototype stand-in for Entra ID.
 *
 * In production these come from the OIDC token's group claims. Nothing else in
 * the platform changes: `access.view` and `action.requires` already name
 * groups, and every check happens server-side.
 */
export const DEMO_USERS: Record<string, User> = {
  analyst: {
    id: "u-analyst",
    name: "Sam Okafor",
    roles: ["support-agent", "kyc-analyst", "engineer"],
  },
  lead: {
    id: "u-lead",
    name: "Adrian Leung",
    roles: [
      "support-agent",
      "finance-lead",
      "kyc-analyst",
      "compliance-lead",
      "engineer",
      "platform-admin",
    ],
  },
};

export const DEFAULT_ROLE_KEY = "analyst";

export function hasRole(user: User, required: readonly string[]): boolean {
  return required.some((role) => user.roles.includes(role));
}
