import { describe, expect, it } from "vitest";
import { claimsToUser, parseGroupRoleMap, rolesFromGroups } from "../entra";

const MAP = {
  "11111111-aaaa-4444-bbbb-000000000001": "support-agent",
  "11111111-aaaa-4444-bbbb-000000000002": "finance-lead",
};

describe("parseGroupRoleMap", () => {
  it("parses a JSON object of group id to role", () => {
    expect(parseGroupRoleMap(JSON.stringify(MAP))).toEqual(MAP);
  });

  it("returns an empty map for an empty value", () => {
    expect(parseGroupRoleMap("")).toEqual({});
    expect(parseGroupRoleMap("  ")).toEqual({});
  });

  it("rejects non-object values", () => {
    expect(() => parseGroupRoleMap('["a"]')).toThrow(/JSON object/);
    expect(() => parseGroupRoleMap('"x"')).toThrow(/JSON object/);
  });

  it("rejects non-string roles", () => {
    expect(() => parseGroupRoleMap('{"g": 1}')).toThrow(/must be a string/);
  });
});

describe("rolesFromGroups", () => {
  it("maps known groups to roles and ignores unknown groups", () => {
    const roles = rolesFromGroups(
      ["unknown-group", "11111111-aaaa-4444-bbbb-000000000002"],
      MAP,
    );
    expect(roles).toEqual(["finance-lead"]);
  });

  it("deduplicates roles reachable via multiple groups", () => {
    const map = { g1: "support-agent", g2: "support-agent" };
    expect(rolesFromGroups(["g1", "g2"], map)).toEqual(["support-agent"]);
  });

  it("yields no roles when the user is in no mapped group", () => {
    expect(rolesFromGroups(["other"], MAP)).toEqual([]);
  });
});

describe("claimsToUser", () => {
  it("builds a platform user from ID token claims", () => {
    const user = claimsToUser(
      {
        oid: "user-oid",
        sub: "subject",
        name: "Sam Okafor",
        groups: ["11111111-aaaa-4444-bbbb-000000000001"],
      },
      MAP,
    );
    expect(user).toEqual({
      id: "user-oid",
      name: "Sam Okafor",
      roles: ["support-agent"],
    });
  });

  it("falls back to sub and preferred_username when oid/name are absent", () => {
    const user = claimsToUser(
      { sub: "subject", preferred_username: "sam@yourco.com" },
      MAP,
    );
    expect(user.id).toBe("subject");
    expect(user.name).toBe("sam@yourco.com");
    expect(user.roles).toEqual([]);
  });
});
