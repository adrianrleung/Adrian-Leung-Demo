import { record } from "./audit";
import { hasRole, type User } from "./users";
import { HttpError, requireRowAccess } from "./server";
import type { ActionContext, AppConfig, Row } from "./types";

/** Stub effect. A real deployment swaps this for an Incoming Webhook call. */
async function teams(channel: string, message: string): Promise<void> {
  console.info(`[teams:${channel}] ${message}`);
}

/**
 * Runs an action. Authorisation is checked here, on the server, regardless of
 * whether the UI rendered the button.
 */
export async function runAction(
  app: AppConfig,
  actionName: string,
  rowId: string,
  user: User,
  input: Row,
): Promise<void> {
  const action = app.actions?.[actionName];
  if (!action) throw new HttpError(404, `No action "${actionName}" on ${app.slug}`);
  if (!hasRole(user, [action.requires])) {
    throw new HttpError(403, `"${action.label}" requires the ${action.requires} role`);
  }

  const row = await app.source.get(rowId);
  if (!row) throw new HttpError(404, `Row ${rowId} not found`);
  requireRowAccess(app, user, row);

  for (const [name, def] of Object.entries(action.fields ?? {})) {
    if (def.kind === "text" && !String(input[name] ?? "").trim()) {
      throw new HttpError(400, `"${def.label ?? name}" is required`);
    }
  }

  const ctx: ActionContext = {
    user,
    db: { update: (id, patch) => app.source.update(id, patch) },
    notify: { teams },
  };

  await action.run(ctx, row, input);

  if (app.audit !== false) {
    await record(app.slug, rowId, user, actionName, input);
  }
}
