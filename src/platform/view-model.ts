import { hasRole, type User } from "./users";
import type { AppConfig, FieldDef, LayoutSlot, Sort } from "./types";

/**
 * Serialisable projection of an app config for client components. Handlers and
 * the data source stay on the server; only the declarative shape crosses the
 * boundary.
 */
export interface ClientApp {
  slug: string;
  name: string;
  description?: string;
  fields: Record<string, FieldDef>;
  list: {
    columns: string[];
    filters: string[];
    searchable: boolean;
    defaultSort?: Sort;
  };
  detail: { layout: LayoutSlot[] };
  /** Present when the app accepts submissions and this user may submit. */
  create?: { fields: string[] };
  actions: ClientAction[];
}

export interface ClientAction {
  name: string;
  label: string;
  variant: "primary" | "danger";
  confirm?: string;
  fields: Record<string, FieldDef>;
  /** Whether this user may invoke it. The server re-checks regardless. */
  allowed: boolean;
}

export function toClientApp(app: AppConfig, user: User): ClientApp {
  return {
    slug: app.slug,
    name: app.name,
    description: app.description,
    fields: app.fields,
    list: {
      columns: [...app.list.columns],
      filters: [...(app.list.filters ?? [])],
      searchable: Boolean(app.list.search?.length),
      defaultSort: app.list.defaultSort,
    },
    detail: {
      layout: app.detail
        ? [...app.detail.layout]
        : Object.keys(app.fields).map((name) => name),
    },
    create:
      app.create &&
      (!app.create.requires || hasRole(user, [app.create.requires]))
        ? { fields: [...app.create.fields] }
        : undefined,
    actions: Object.entries(app.actions ?? {}).map(([name, action]) => ({
      name,
      label: action.label,
      variant: action.variant ?? "primary",
      confirm: action.confirm,
      fields: action.fields ?? {},
      allowed: hasRole(user, [action.requires]),
    })),
  };
}
