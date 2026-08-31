import "server-only";
import NextAuth, { type Profile } from "next-auth";
import type {} from "next-auth/jwt";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { claimsToUser, parseGroupRoleMap, type EntraClaims } from "./entra";
import type { User } from "./users";

declare module "next-auth/jwt" {
  interface JWT {
    platformUser?: User;
  }
}

const groupRoleMap = parseGroupRoleMap(process.env.ENTRA_GROUP_ROLE_MAP ?? "");

function toClaims(profile: Profile): EntraClaims {
  return {
    oid: typeof profile.oid === "string" ? profile.oid : undefined,
    sub: typeof profile.sub === "string" ? profile.sub : "",
    name: typeof profile.name === "string" ? profile.name : undefined,
    preferred_username:
      typeof profile.preferred_username === "string"
        ? profile.preferred_username
        : undefined,
    groups: Array.isArray(profile.groups)
      ? profile.groups.filter((g): g is string => typeof g === "string")
      : undefined,
  };
}

/**
 * Entra ID OIDC via Auth.js. The rest of the platform only ever sees a `User`
 * with roles resolved from the token's group claims, so app configs and
 * permission checks are identical in demo and entra modes.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID ?? "common"}/v2.0`,
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      if (profile) token.platformUser = claimsToUser(toClaims(profile), groupRoleMap);
      return token;
    },
    session({ session, token }) {
      return Object.assign(session, { platformUser: token.platformUser });
    },
  },
});

export async function entraUser(): Promise<User | null> {
  const session = await auth();
  if (!session) return null;
  const user = (session as { platformUser?: User }).platformUser;
  return user ?? null;
}
