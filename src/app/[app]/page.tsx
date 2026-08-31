import { notFound } from "next/navigation";
import { ListView } from "@/components/list-view";
import { RoleSwitcher } from "@/components/role-switcher";
import { currentUser, hasRole } from "@/platform/auth";
import { getApp } from "@/platform/registry";
import { toClientApp } from "@/platform/view-model";

export default async function AppListPage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app: slug } = await params;
  const config = getApp(slug);
  const user = await currentUser();
  if (!config || !hasRole(user, config.access.view)) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{config.name}</h1>
          {config.description && (
            <p className="mt-1 text-sm text-slate-500">{config.description}</p>
          )}
        </div>
        <RoleSwitcher user={user} />
      </header>
      <ListView app={toClientApp(config, user)} />
    </main>
  );
}
