import { describe, expect, it } from "vitest";
import { AppConfigError, validateApp } from "../define-app";
import { field } from "../fields";
import type { AppConfig, Capabilities, DataSource } from "../types";

const FULL: Capabilities = {
  operators: ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"],
  search: true,
  sort: true,
  exactCount: true,
};

function fakeSource(capabilities: Capabilities): DataSource {
  return {
    kind: "fake",
    capabilities,
    fields: ["id", "name", "amount", "status"],
    list: async () => ({ rows: [], total: 0, nextCursor: null }),
    get: async () => null,
    insert: async (row) => row,
    update: async () => ({}),
  };
}

function config(source: DataSource, overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    slug: "test",
    name: "Test",
    owner: "test-team",
    source,
    access: { view: ["everyone"] },
    fields: {
      id: field.id(),
      name: field.text({ searchable: true }),
      amount: field.money({ filterable: true, sortable: true }),
      status: field.enum(["open", "closed"], { filterable: true }),
    },
    list: {
      columns: ["name", "amount"],
      filters: ["amount", "status"],
      search: ["name"],
      defaultSort: { field: "amount", direction: "desc" },
    },
    ...overrides,
  };
}

describe("validateApp", () => {
  it("accepts a config the source can fully serve", () => {
    expect(() => validateApp(config(fakeSource(FULL)))).not.toThrow();
  });

  // The delegation guarantee: a filter the source cannot push down is a build
  // failure, not a silent client-side truncation.
  it("rejects a filter the source cannot execute server-side", () => {
    const limited = fakeSource({ ...FULL, operators: ["eq"] });
    expect(() => validateApp(config(limited))).toThrow(AppConfigError);
    expect(() => validateApp(config(limited))).toThrow(/does not support \[gte, lte\]/);
  });

  it("rejects search when the source cannot search", () => {
    const limited = fakeSource({ ...FULL, search: false });
    expect(() => validateApp(config(limited))).toThrow(/cannot search server-side/);
  });

  it("rejects filtering a field not marked filterable", () => {
    const app = config(fakeSource(FULL));
    app.fields.status = field.enum(["open", "closed"]);
    expect(() => validateApp(app)).toThrow(/not marked filterable/);
  });

  it("rejects references to fields the source does not expose", () => {
    const app = config(fakeSource(FULL), {
      list: { columns: ["name", "ghost"], filters: [] },
    });
    app.fields.ghost = field.text();
    expect(() => validateApp(app)).toThrow(/source does not expose/);
  });

  it("rejects an action with no required role", () => {
    const app = config(fakeSource(FULL), {
      actions: {
        close: { label: "Close", requires: "", run: async () => {} },
      },
    });
    expect(() => validateApp(app)).toThrow(/no required role/);
  });

  it("rejects a config with no owner", () => {
    const app = config(fakeSource(FULL), { owner: "" });
    expect(() => validateApp(app)).toThrow(/owner is required/);
  });

  it("rejects a create form over a read-only field", () => {
    const app = config(fakeSource(FULL), {
      create: { fields: ["id", "name"] },
    });
    expect(() => validateApp(app)).toThrow(/read-only/);
  });
});
