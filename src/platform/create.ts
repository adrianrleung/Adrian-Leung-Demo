import { record } from "./audit";
import { hasRole, type User } from "./users";
import { HttpError } from "./server";
import type { AppConfig, Row } from "./types";

const NUMERIC_KINDS = new Set(["number", "money"]);

/**
 * Handles a generic "new request" submission. Field coercion and validation
 * are driven entirely by the app's declared fields; server-side defaults are
 * merged last so the client can never override them.
 */
export async function createRow(
  app: AppConfig,
  user: User,
  input: Row,
): Promise<Row> {
  const create = app.create;
  if (!create) throw new HttpError(404, `${app.slug} does not accept submissions`);
  if (create.requires && !hasRole(user, [create.requires])) {
    throw new HttpError(403, `Submitting to ${app.name} requires the ${create.requires} role`);
  }

  const row: Row = {};
  for (const name of create.fields) {
    const def = app.fields[name];
    const label = def.label ?? name;
    const raw = input[name];

    if (def.kind === "boolean") {
      row[name] = Boolean(raw);
      continue;
    }
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      throw new HttpError(400, `"${label}" is required`);
    }
    if (NUMERIC_KINDS.has(def.kind)) {
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new HttpError(400, `"${label}" must be a number`);
      row[name] = value;
      continue;
    }
    if (def.kind === "enum" && !def.options?.includes(String(raw))) {
      throw new HttpError(400, `"${label}" must be one of: ${def.options?.join(", ")}`);
    }
    row[name] = String(raw);
  }

  Object.assign(row, create.defaults?.({ id: user.id, name: user.name }) ?? {});

  const created = await app.source.insert(row);
  if (app.audit !== false) {
    await record(app.slug, String(created.id ?? ""), user, "create", row);
  }
  return created;
}
