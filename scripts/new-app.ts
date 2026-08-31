import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Scaffolds a new internal tool:
 *
 *   npm run new-app -- expense-requests
 *
 * Generates the app config, a SQL migration for its table, and registers the
 * app. Edit the generated files, run the SQL, and the tool is live.
 */

const slug = process.argv[2];
if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error("Usage: npm run new-app -- <slug>   (lowercase, hyphenated)");
  process.exit(1);
}

const root = process.cwd();
const table = slug.replaceAll("-", "_");
const camel = slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const title = slug
  .split("-")
  .map((word) => word[0].toUpperCase() + word.slice(1))
  .join(" ");

const appPath = path.join(root, "src", "apps", `${slug}.app.ts`);
const sqlPath = path.join(root, "db", "migrations", `${slug}.sql`);
const registryPath = path.join(root, "src", "platform", "registry.ts");

if (existsSync(appPath)) {
  console.error(`${appPath} already exists`);
  process.exit(1);
}

const appConfig = `import { defineApp } from "@/platform/define-app";
import { field } from "@/platform/fields";
import { postgres } from "@/platform/adapters/postgres";

export default defineApp({
  slug: "${slug}",
  name: "${title}",
  description: "TODO: one-line description shown on the app page.",
  owner: "TODO-owning-team",

  source: postgres.table("${table}", {
    primaryKey: "id",
    columns: ["id", "title", "status", "created_at"],
    searchColumns: ["title"],
  }),

  access: { view: ["support-agent"] },

  fields: {
    id: field.id(),
    title: field.text({ label: "Title", searchable: true }),
    status: field.enum(["open", "closed"], { label: "Status", filterable: true }),
    created_at: field.datetime({ label: "Created", sortable: true, readOnly: true }),
  },

  list: {
    columns: ["title", "status", "created_at"],
    filters: ["status"],
    search: ["title"],
    defaultSort: { field: "created_at", direction: "desc" },
  },

  create: {
    fields: ["title"],
    defaults: () => ({ status: "open" }),
  },

  audit: true,
});
`;

const migration = `-- Table for the ${title} app. Apply with:
--   psql "$DATABASE_URL" -f db/migrations/${slug}.sql
CREATE TABLE IF NOT EXISTS ${table} (
  id         bigserial PRIMARY KEY,
  title      text        NOT NULL,
  status     text        NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

mkdirSync(path.dirname(sqlPath), { recursive: true });
writeFileSync(appPath, appConfig);
writeFileSync(sqlPath, migration);

const registry = readFileSync(registryPath, "utf8");
const importLine = `import ${camel} from "@/apps/${slug}.app";\n`;
const updated = registry
  .replace(/\nconst ALL/, `\n${importLine}const ALL`)
  .replace(/(const ALL[^=]*= \[[^\]]*)(\];)/, `$1  ${camel},\n$2`);
console.log(`Created:
  ${path.relative(root, appPath)}     — edit fields/roles to fit
  ${path.relative(root, sqlPath)}  — apply to the database`);

if (updated === registry) {
  console.warn(`Could not auto-register; add ${camel} to ${registryPath} manually.`);
} else {
  writeFileSync(registryPath, updated);
  console.log(`Registered the app in src/platform/registry.ts. It mounts at /${slug}.`);
}
