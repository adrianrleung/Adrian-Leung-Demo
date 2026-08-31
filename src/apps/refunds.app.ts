import { defineApp } from "@/platform/define-app";
import { field } from "@/platform/fields";
import { postgres } from "@/platform/adapters/postgres";

/**
 * A complete internal tool. Everything below is declarative except the two
 * action handlers, which are ordinary async TypeScript and unit-test as such.
 */
export default defineApp({
  slug: "refunds",
  name: "Refunds Review",
  description: "Approve or decline customer refund requests.",

  source: postgres.table("refund_requests", {
    primaryKey: "id",
    columns: [
      "id",
      "customer_name",
      "customer_email",
      "amount",
      "currency",
      "reason",
      "status",
      "risk_flag",
      "requested_at",
      "decided_by",
      "decided_at",
      "decline_reason",
    ],
    searchColumns: ["customer_name", "customer_email"],
  }),

  access: { view: ["support-agent", "finance-lead"] },

  fields: {
    id: field.id(),
    customer_name: field.text({ label: "Customer", searchable: true }),
    customer_email: field.text({
      label: "Email",
      searchable: true,
      // Stripped from the API response for anyone without finance-lead.
      visibleTo: ["finance-lead"],
      mask: true,
    }),
    amount: field.money({ label: "Amount", filterable: true, sortable: true }),
    currency: field.text({ label: "Currency" }),
    reason: field.text({ label: "Reason" }),
    status: field.enum(["pending", "approved", "declined"], {
      label: "Status",
      filterable: true,
    }),
    risk_flag: field.enum(["low", "medium", "high"], {
      label: "Risk",
      filterable: true,
    }),
    requested_at: field.datetime({
      label: "Requested",
      sortable: true,
      readOnly: true,
    }),
    decided_by: field.text({ label: "Decided by", readOnly: true }),
    decided_at: field.datetime({ label: "Decided", readOnly: true }),
    decline_reason: field.text({ label: "Decline reason", readOnly: true }),
  },

  list: {
    columns: ["customer_name", "amount", "reason", "risk_flag", "requested_at"],
    filters: ["status", "risk_flag", "amount"],
    search: ["customer_name", "customer_email"],
    defaultSort: { field: "requested_at", direction: "desc" },
  },

  detail: {
    layout: [
      ["customer_name", "customer_email"],
      ["amount", "currency"],
      ["status", "risk_flag"],
      "reason",
      ["decided_by", "decided_at"],
      "decline_reason",
    ],
  },

  actions: {
    approve: {
      label: "Approve refund",
      requires: "finance-lead",
      variant: "primary",
      confirm: "Approve this refund? The customer will be credited.",
      async run(ctx, row) {
        await ctx.db.update(String(row.id), {
          status: "approved",
          decided_by: ctx.user.name,
          decided_at: new Date().toISOString(),
        });
        await ctx.notify.teams(
          "#finance",
          `${ctx.user.name} approved a ${row.currency} ${row.amount} refund for ${row.customer_name}`,
        );
      },
    },
    decline: {
      label: "Decline",
      requires: "finance-lead",
      variant: "danger",
      fields: {
        decline_reason: field.text({ label: "Reason for declining" }),
      },
      async run(ctx, row, input) {
        await ctx.db.update(String(row.id), {
          status: "declined",
          decided_by: ctx.user.name,
          decided_at: new Date().toISOString(),
          decline_reason: String(input.decline_reason ?? ""),
        });
      },
    },
  },

  audit: true,
});
