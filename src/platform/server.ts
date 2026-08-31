import { getApp } from "./registry";
import { hasRole, type User } from "./users";
import type { AppConfig, Filter, Operator, Query, Row } from "./types";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const PAGE_SIZE = 25;

export function requireVisibleApp(slug: string, user: User): AppConfig {
  const app = getApp(slug);
  if (!app) throw new HttpError(404, `No app "${slug}"`);
  if (!hasRole(user, app.access.view)) {
    throw new HttpError(403, `You do not have access to ${app.name}`);
  }
  return app;
}

/**
 * Removes fields the viewer is not entitled to see.
 *
 * Stripped from the payload, not hidden in the UI — a masked value present in
 * the JSON response is a compliance finding waiting to happen.
 */
export function applyFieldVisibility(
  app: AppConfig,
  user: User,
  row: Row,
): Row {
  const out: Row = {};
  for (const [name, value] of Object.entries(row)) {
    const def = app.fields[name];
    if (def?.visibleTo && !hasRole(user, def.visibleTo)) {
      if (def.mask) out[name] = "••••••••";
      continue;
    }
    out[name] = value;
  }
  return out;
}

const NUMERIC_KINDS = new Set(["number", "money"]);

/**
 * Builds a Query from URL params, accepting only filters the app declared.
 * An undeclared filter is rejected rather than quietly applied in memory.
 */
export function parseQuery(app: AppConfig, params: URLSearchParams): Query {
  const filters: Filter[] = [];
  const allowed = new Set(app.list.filters ?? []);

  for (const [key, raw] of params.entries()) {
    if (!key.startsWith("f.") || raw === "") continue;
    const [name, op = "eq"] = key.slice(2).split(":");
    if (!allowed.has(name)) {
      throw new HttpError(400, `"${name}" is not a filterable field on ${app.slug}`);
    }
    const def = app.fields[name];
    const value = NUMERIC_KINDS.has(def.kind) ? Number(raw) : raw;
    filters.push({ field: name, op: op as Operator, value });
  }

  const search = params.get("q") ?? undefined;
  if (search && !app.list.search?.length) {
    throw new HttpError(400, `${app.slug} does not declare searchable fields`);
  }

  return {
    filters,
    search,
    sort: app.list.defaultSort ? [app.list.defaultSort] : [],
    cursor: params.get("cursor") ?? undefined,
    limit: PAGE_SIZE,
  };
}
