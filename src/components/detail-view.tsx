"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { FieldDisplay } from "./field-display";
import type { AuditEntry } from "@/platform/audit";
import type { ClientAction, ClientApp } from "@/platform/view-model";
import type { FieldDef } from "@/platform/types";

type Row = Record<string, unknown>;

export function DetailView({
  app,
  row,
  history,
}: {
  app: ClientApp;
  row: Row;
  history: AuditEntry[];
}) {
  const router = useRouter();
  const [active, setActive] = useState<ClientAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/${app.slug}`}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← {app.name}
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {String(row[app.list.columns[0]] ?? row.id)}
          </h1>
        </div>
        <div className="flex gap-2">
          {app.actions.map((action) => (
            <button
              key={action.name}
              disabled={!action.allowed}
              title={action.allowed ? undefined : "Your role does not permit this"}
              onClick={() => {
                setError(null);
                setActive(action);
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                action.variant === "danger"
                  ? "border border-rose-300 text-rose-700 hover:bg-rose-50"
                  : "bg-slate-900 text-white hover:bg-slate-700"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
          {app.detail.layout.flatMap((slot, index) => {
            if (typeof slot === "object" && "component" in slot) {
              return [
                <div key={`c-${index}`} className="col-span-2">
                  <EscapeHatch name={slot.component} />
                </div>,
              ];
            }
            const names = Array.isArray(slot) ? slot : [slot];
            return names.map((name) => (
              <div key={name}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {app.fields[name]?.label ?? name}
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  <FieldDisplay def={app.fields[name]} value={row[name]} row={row} />
                </dd>
              </div>
            ));
          })}
        </dl>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Activity
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {history.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <span className="w-36 shrink-0 text-slate-400">
                {new Date(entry.created_at).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-slate-700">
                <strong className="font-medium">{entry.actor_name}</strong> {entry.event}
              </span>
            </li>
          ))}
          {!history.length && <li className="text-slate-400">No activity yet</li>}
        </ul>
      </div>

      {active && (
        <ActionModal
          app={app}
          action={active}
          rowId={String(row.id)}
          onClose={() => setActive(null)}
          onError={setError}
          onDone={() => {
            setActive(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ActionModal({
  app,
  action,
  rowId,
  onClose,
  onDone,
  onError,
}: {
  app: ClientApp;
  action: ClientAction;
  rowId: string;
  onClose: () => void;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [input, setInput] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const extra = Object.entries(action.fields) as [string, FieldDef][];

  async function submit() {
    setBusy(true);
    const response = await fetch(`/api/${app.slug}/actions/${action.name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rowId, input }),
    });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json();
      onError(body.error ?? "Action failed");
      onClose();
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{action.label}</h2>
        {action.confirm && (
          <p className="mt-2 text-sm text-slate-600">{action.confirm}</p>
        )}
        {extra.map(([name, def]) => (
          <label key={name} className="mt-4 block text-sm">
            <span className="font-medium text-slate-700">{def.label ?? name}</span>
            <input
              autoFocus
              value={input[name] ?? ""}
              onChange={(event) =>
                setInput((current) => ({ ...current, [name]: event.target.value }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
            />
          </label>
        ))}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? "Working…" : action.label}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Placeholder for the hand-written-component escape hatch. */
function EscapeHatch({ name }: { name: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
      Custom component <code className="font-mono">{name}</code>
    </div>
  );
}
