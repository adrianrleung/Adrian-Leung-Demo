"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FieldDisplay } from "./field-display";
import type { ClientApp } from "@/platform/view-model";

type Row = Record<string, unknown>;

/**
 * The list screen for every app. Filters are sent to the server and translated
 * to SQL; nothing is filtered in the browser, so `total` is a real COUNT and
 * results are never silently truncated.
 */
export function ListView({ app }: { app: ClientApp }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (append: string | null = null) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      for (const [name, value] of Object.entries(filters)) {
        if (!value) continue;
        const kind = app.fields[name].kind;
        const op = kind === "money" || kind === "number" ? "gte" : "eq";
        params.set(`f.${name}:${op}`, value);
      }
      if (search) params.set("q", search);
      if (append) params.set("cursor", append);

      const response = await fetch(`/api/${app.slug}/rows?${params}`);
      const body = await response.json();
      setLoading(false);
      if (!response.ok) {
        setError(body.error ?? "Request failed");
        return;
      }
      setRows((previous) => (append ? [...previous, ...body.rows] : body.rows));
      setTotal(body.total);
      setCursor(body.nextCursor);
    },
    [app, filters, search],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
        {app.list.searchable && (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="name or email"
              className="w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            />
          </label>
        )}
        {app.list.filters.map((name) => {
          const def = app.fields[name];
          return (
            <label
              key={name}
              className="flex flex-col gap-1 text-xs font-medium text-slate-500"
            >
              {def.label ?? name}
              {def.kind === "enum" ? (
                <select
                  value={filters[name] ?? ""}
                  onChange={(event) =>
                    setFilters((f) => ({ ...f, [name]: event.target.value }))
                  }
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                >
                  <option value="">All</option>
                  {def.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    def.kind === "number" || def.kind === "money" ? "number" : "text"
                  }
                  value={filters[name] ?? ""}
                  onChange={(event) =>
                    setFilters((f) => ({ ...f, [name]: event.target.value }))
                  }
                  placeholder={
                    def.kind === "number" || def.kind === "money" ? "min" : "exact"
                  }
                  className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                />
              )}
            </label>
          );
        })}
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {app.list.columns.map((name) => (
                <th key={name} className="px-4 py-2.5 font-medium">
                  {app.fields[name].label ?? name}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={String(row.id)} className="hover:bg-slate-50">
                {app.list.columns.map((name) => (
                  <td key={name} className="px-4 py-2.5">
                    <FieldDisplay def={app.fields[name]} value={row[name]} row={row} />
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/${app.slug}/${row.id}`}
                    className="text-slate-400 hover:text-slate-900"
                  >
                    →
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td
                  colSpan={app.list.columns.length + 1}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No matching records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {rows.length} of {total.toLocaleString()}
          <span className="ml-2 text-xs text-slate-400">
            (COUNT from Postgres, not a client-side buffer)
          </span>
        </span>
        {cursor && (
          <button
            onClick={() => void load(cursor)}
            disabled={loading}
            className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white disabled:opacity-50"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
