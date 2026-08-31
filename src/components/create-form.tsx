"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClientApp } from "@/platform/view-model";

/**
 * Generic "new request" form, generated from the app's `create` config. Field
 * inputs come from the same field definitions that drive the list and detail
 * views; validation and defaults are applied server-side.
 */
export function CreateButton({ app }: { app: ClientApp }) {
  const [open, setOpen] = useState(false);
  if (!app.create) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        New request
      </button>
      {open && <CreateModal app={app} onClose={() => setOpen(false)} />}
    </>
  );
}

function CreateModal({ app, onClose }: { app: ClientApp; onClose: () => void }) {
  const router = useRouter();
  const [input, setInput] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/${app.slug}/rows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Submission failed");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">
          New {app.name} request
        </h2>
        {error && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {app.create?.fields.map((name) => {
          const def = app.fields[name];
          return (
            <label key={name} className="mt-4 block text-sm">
              <span className="font-medium text-slate-700">{def.label ?? name}</span>
              {def.kind === "enum" ? (
                <select
                  value={input[name] ?? ""}
                  onChange={(event) =>
                    setInput((current) => ({ ...current, [name]: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
                >
                  <option value="">Select…</option>
                  {def.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={def.kind === "number" || def.kind === "money" ? "number" : "text"}
                  value={input[name] ?? ""}
                  onChange={(event) =>
                    setInput((current) => ({ ...current, [name]: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
                />
              )}
            </label>
          );
        })}
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
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
