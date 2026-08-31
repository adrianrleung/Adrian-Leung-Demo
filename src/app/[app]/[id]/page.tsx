import { notFound } from "next/navigation";
import { DetailView } from "@/components/detail-view";
import { RoleSwitcher } from "@/components/role-switcher";
import { history } from "@/platform/audit";
import { AUTH_MODE, currentUser, hasRole } from "@/platform/auth";
import { getApp } from "@/platform/registry";
import {
  applyFieldVisibility,
  matchesFilters,
  rowAccessFilters,
} from "@/platform/server";
import { toClientApp } from "@/platform/view-model";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ app: string; id: string }>;
}) {
  const { app: slug, id } = await params;
  const config = getApp(slug);
  const user = await currentUser();
  if (!config || !hasRole(user, config.access.view)) notFound();

  const row = await config.source.get(id);
  if (!row || !matchesFilters(row, rowAccessFilters(config, user))) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      {AUTH_MODE === "demo" && (
        <div className="flex justify-end">
          <RoleSwitcher user={user} />
        </div>
      )}
      <DetailView
        app={toClientApp(config, user)}
        row={applyFieldVisibility(config, user, row)}
        history={config.audit === false ? [] : await history(slug, id)}
      />
    </main>
  );
}
