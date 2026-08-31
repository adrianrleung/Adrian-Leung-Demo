/**
 * Core platform types.
 *
 * The single most important invariant in this file: a `Query` is always
 * translated into a query the data source executes itself. There is no
 * client-side filtering path anywhere in the platform, which is what makes
 * Power Apps' "silently return the first 500 rows" failure mode structurally
 * impossible here.
 */

export type Operator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "in";

export interface Filter {
  field: string;
  op: Operator;
  value: unknown;
}

export interface Sort {
  field: string;
  direction: "asc" | "desc";
}

export interface Query {
  filters: Filter[];
  search?: string;
  sort: Sort[];
  /** Opaque keyset cursor produced by the previous page. */
  cursor?: string;
  limit: number;
}

export interface Page<T> {
  rows: T[];
  /** Total matching rows, counted by the data source. Never a buffer size. */
  total: number;
  nextCursor: string | null;
}

/**
 * What a data source can do server-side. App configs are validated against
 * this at build time, so declaring a filter the adapter cannot push down is a
 * failed build rather than a wrong answer in production.
 */
export interface Capabilities {
  operators: Operator[];
  search: boolean;
  sort: boolean;
  exactCount: boolean;
}

export type Row = Record<string, unknown>;

export interface DataSource {
  readonly kind: string;
  readonly capabilities: Capabilities;
  /** Fields the source can filter/sort on, used by build-time validation. */
  readonly fields: readonly string[];
  list(query: Query): Promise<Page<Row>>;
  get(id: string): Promise<Row | null>;
  insert(row: Row): Promise<Row>;
  update(id: string, patch: Row): Promise<Row>;
}

export type FieldKind =
  | "id"
  | "text"
  | "number"
  | "money"
  | "enum"
  | "datetime"
  | "boolean"
  | "geolocation";

export interface FieldDef {
  kind: FieldKind;
  label?: string;
  /** Declaring these drives build-time capability checks and index hints. */
  filterable?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  readOnly?: boolean;
  /** Enum member values. */
  options?: readonly string[];
  /** Currency code for money fields. */
  currency?: string;
  /** Mask the value unless the viewer holds one of `visibleTo`. */
  mask?: boolean;
  /**
   * Roles allowed to see this field. Enforced by stripping the value from the
   * API response, never by hiding it in the UI.
   */
  visibleTo?: readonly string[];
}

export interface ActionContext {
  user: { id: string; name: string; roles: readonly string[] };
  db: {
    update(id: string, patch: Row): Promise<Row>;
  };
  notify: {
    teams(channel: string, message: string): Promise<void>;
  };
}

export interface ActionDef {
  label: string;
  /** Role required to invoke. Re-checked server-side on every call. */
  requires: string;
  variant?: "primary" | "danger";
  confirm?: string;
  /** Extra inputs collected in the action modal. */
  fields?: Record<string, FieldDef>;
  run(ctx: ActionContext, row: Row, input: Row): Promise<void>;
}

export type LayoutSlot = string | string[] | { component: string };

export interface AppConfig {
  slug: string;
  name: string;
  description?: string;
  /** Owning team, e.g. "payments-team". Required so no app is unowned. */
  owner: string;
  source: DataSource;
  access: {
    view: readonly string[];
    /**
     * Row-level access: filters injected server-side into every list query
     * and re-checked against individual rows on detail/action paths.
     */
    rows?: (user: { id: string; roles: readonly string[] }) => Filter[];
  };
  fields: Record<string, FieldDef>;
  list: {
    columns: readonly string[];
    filters?: readonly string[];
    search?: readonly string[];
    defaultSort?: Sort;
  };
  detail?: { layout: readonly LayoutSlot[] };
  /** Enables a generic "new request" form for submitting rows. */
  create?: {
    fields: readonly string[];
    /** Role required to submit. Defaults to anyone who can view the app. */
    requires?: string;
    /** Server-side values merged over the submitted input. */
    defaults?: (user: { id: string; name: string }) => Row;
  };
  actions?: Record<string, ActionDef>;
  audit?: boolean;
}
