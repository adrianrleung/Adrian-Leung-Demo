import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimits } from "../rate-limit";
import { assertSameOrigin, matchesFilters, rowAccessFilters, HttpError } from "../server";
import { field } from "../fields";
import type { AppConfig } from "../types";

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests within the window limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(() => checkRateLimit("u1", 5, 60_000, 1_000)).not.toThrow();
    }
  });

  it("rejects the request that exceeds the limit", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("u1", 3, 60_000, 1_000);
    expect(() => checkRateLimit("u1", 3, 60_000, 1_000)).toThrow(HttpError);
  });

  it("tracks users independently", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("u1", 3, 60_000, 1_000);
    expect(() => checkRateLimit("u2", 3, 60_000, 1_000)).not.toThrow();
  });

  it("resets after the window elapses", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("u1", 3, 60_000, 1_000);
    expect(() => checkRateLimit("u1", 3, 60_000, 62_000)).not.toThrow();
  });
});

describe("assertSameOrigin", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://tools.local/api/x", { method: "POST", headers });

  it("accepts a same-origin request", () => {
    expect(() =>
      assertSameOrigin(request({ origin: "http://tools.local", host: "tools.local" })),
    ).not.toThrow();
  });

  it("accepts a request with no Origin header (curl, server-to-server)", () => {
    expect(() => assertSameOrigin(request({ host: "tools.local" }))).not.toThrow();
  });

  it("rejects a cross-site request", () => {
    expect(() =>
      assertSameOrigin(request({ origin: "https://evil.example", host: "tools.local" })),
    ).toThrow(/Cross-origin/);
  });
});

describe("row-level access", () => {
  const app = {
    slug: "t",
    name: "T",
    owner: "test-team",
    source: {} as AppConfig["source"],
    access: {
      view: ["agent"],
      rows: (user) => [{ field: "assigned_to", op: "eq", value: user.id }],
    },
    fields: { id: field.id(), assigned_to: field.text() },
    list: { columns: ["id"] },
  } satisfies AppConfig;

  it("produces per-user filters for injection into list queries", () => {
    expect(rowAccessFilters(app, { id: "u9", name: "X", roles: ["agent"] })).toEqual([
      { field: "assigned_to", op: "eq", value: "u9" },
    ]);
  });

  it("matches only rows the user may see", () => {
    const filters = rowAccessFilters(app, { id: "u9", name: "X", roles: ["agent"] });
    expect(matchesFilters({ id: 1, assigned_to: "u9" }, filters)).toBe(true);
    expect(matchesFilters({ id: 2, assigned_to: "other" }, filters)).toBe(false);
  });

  it("imposes no filters for apps without access.rows", () => {
    const open = { ...app, access: { view: ["agent"] } };
    expect(rowAccessFilters(open, { id: "u9", name: "X", roles: [] })).toEqual([]);
  });
});
