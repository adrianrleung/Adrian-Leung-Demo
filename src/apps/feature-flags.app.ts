import { defineApp } from "@/platform/define-app";
import { field } from "@/platform/fields";
import { postgres } from "@/platform/adapters/postgres";

/**
 * Feature flag admin panel. Demonstrates the admin-CRUD shape: no approval
 * workflow, just records with guarded toggle actions and an audit trail of
 * who flipped what, when.
 */
export default defineApp({
  slug: "feature-flags",
  name: "Feature Flags",
  description: "Toggle product feature flags per environment.",
  owner: "platform-team",

  source: postgres.table("feature_flags", {
    primaryKey: "id",
    columns: [
      "id",
      "flag_key",
      "description",
      "environment",
      "enabled",
      "owner_team",
      "updated_by",
      "updated_at",
    ],
    searchColumns: ["flag_key", "description"],
  }),

  access: { view: ["engineer", "platform-admin"] },

  fields: {
    id: field.id(),
    flag_key: field.text({ label: "Flag", searchable: true }),
    description: field.text({ label: "Description" }),
    environment: field.enum(["dev", "staging", "prod"], {
      label: "Environment",
      filterable: true,
    }),
    enabled: field.enum(["on", "off"], { label: "State", filterable: true }),
    owner_team: field.text({ label: "Owner", filterable: true }),
    updated_by: field.text({ label: "Last changed by", readOnly: true }),
    updated_at: field.datetime({
      label: "Last changed",
      sortable: true,
      readOnly: true,
    }),
  },

  list: {
    columns: ["flag_key", "environment", "enabled", "owner_team", "updated_at"],
    filters: ["environment", "enabled", "owner_team"],
    search: ["flag_key", "description"],
    defaultSort: { field: "updated_at", direction: "desc" },
  },

  detail: {
    layout: [
      ["flag_key", "environment"],
      ["enabled", "owner_team"],
      "description",
      ["updated_by", "updated_at"],
    ],
  },

  create: {
    fields: ["flag_key", "description", "environment", "owner_team"],
    requires: "engineer",
    defaults: (user) => ({
      enabled: "off",
      updated_by: user.name,
      updated_at: new Date().toISOString(),
    }),
  },

  actions: {
    enable: {
      label: "Enable",
      requires: "platform-admin",
      variant: "primary",
      confirm: "Enable this flag? It takes effect immediately.",
      async run(ctx, row) {
        await ctx.db.update(String(row.id), {
          enabled: "on",
          updated_by: ctx.user.name,
          updated_at: new Date().toISOString(),
        });
      },
    },
    disable: {
      label: "Disable",
      requires: "platform-admin",
      variant: "danger",
      async run(ctx, row) {
        await ctx.db.update(String(row.id), {
          enabled: "off",
          updated_by: ctx.user.name,
          updated_at: new Date().toISOString(),
        });
      },
    },
  },

  audit: true,
});
