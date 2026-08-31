import type { AppConfig, FieldKind, Operator } from "./types";

export class AppConfigError extends Error {
  constructor(slug: string, problems: string[]) {
    super(
      `Invalid app config "${slug}":\n` + problems.map((p) => `  - ${p}`).join("\n"),
    );
    this.name = "AppConfigError";
  }
}

/**
 * Operators a filter control needs the data source to support, by field kind.
 * If the adapter cannot push all of them down, the app cannot declare the
 * field filterable — and we fail the build rather than filtering in the client.
 */
const REQUIRED_OPERATORS: Record<FieldKind, Operator[]> = {
  id: ["eq"],
  text: ["contains"],
  number: ["gte", "lte"],
  money: ["gte", "lte"],
  enum: ["eq", "in"],
  datetime: ["gte", "lte"],
  boolean: ["eq"],
  geolocation: [],
};

/**
 * Validates an app against its data source's declared capabilities.
 *
 * This is the delegation fix. Power Apps discovers at runtime that a query
 * cannot be delegated and quietly falls back to the first 500 rows; we
 * discover it at build time and refuse to start.
 */
export function validateApp(config: AppConfig): void {
  const problems: string[] = [];
  const { capabilities: caps, fields: sourceFields } = config.source;
  const declared = new Set(Object.keys(config.fields));

  const requireField = (name: string, where: string) => {
    if (!declared.has(name)) {
      problems.push(`${where} references unknown field "${name}"`);
      return false;
    }
    if (!sourceFields.includes(name)) {
      problems.push(
        `${where} references "${name}", which the ${config.source.kind} source does not expose`,
      );
      return false;
    }
    return true;
  };

  if (!config.owner?.trim()) {
    problems.push("owner is required: every app names the team that maintains it");
  }

  for (const column of config.list.columns) requireField(column, "list.columns");

  for (const name of config.list.filters ?? []) {
    if (!requireField(name, "list.filters")) continue;
    const def = config.fields[name];
    if (!def.filterable) {
      problems.push(
        `list.filters includes "${name}" but the field is not marked filterable`,
      );
    }
    const missing = REQUIRED_OPERATORS[def.kind].filter(
      (op) => !caps.operators.includes(op),
    );
    if (missing.length) {
      problems.push(
        `cannot filter "${name}" (${def.kind}) server-side: ` +
          `${config.source.kind} does not support [${missing.join(", ")}]. ` +
          `Filtering it in the browser would silently truncate results, so this is a build error.`,
      );
    }
  }

  for (const name of config.list.search ?? []) {
    if (!requireField(name, "list.search")) continue;
    if (!caps.search) {
      problems.push(
        `list.search is set but the ${config.source.kind} source cannot search server-side`,
      );
    }
  }

  const sort = config.list.defaultSort;
  if (sort && requireField(sort.field, "list.defaultSort")) {
    if (!caps.sort) {
      problems.push(`${config.source.kind} source cannot sort server-side`);
    } else if (!config.fields[sort.field].sortable) {
      problems.push(
        `list.defaultSort uses "${sort.field}" but the field is not marked sortable`,
      );
    }
  }

  for (const name of config.create?.fields ?? []) {
    if (!requireField(name, "create.fields")) continue;
    if (config.fields[name].readOnly) {
      problems.push(`create.fields includes "${name}" but the field is read-only`);
    }
  }

  for (const [name, action] of Object.entries(config.actions ?? {})) {
    if (!action.requires) problems.push(`action "${name}" has no required role`);
  }

  if (problems.length) throw new AppConfigError(config.slug, problems);
}

/**
 * Declares an internal tool. Validation runs at import time, so a bad config
 * fails `next build` and CI rather than misbehaving in production.
 */
export function defineApp(config: AppConfig): AppConfig {
  validateApp(config);
  return config;
}
