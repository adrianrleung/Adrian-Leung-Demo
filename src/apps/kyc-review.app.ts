import { defineApp } from "@/platform/define-app";
import { field } from "@/platform/fields";
import { postgres } from "@/platform/adapters/postgres";

/**
 * KYC review queue: cases flagged by the risk engine land here for a human
 * decision. Demonstrates the review-queue shape — the same generic machinery
 * as refunds, but with different roles, masking, and a three-way decision.
 */
export default defineApp({
  slug: "kyc-review",
  name: "KYC Review",
  description: "Review customers flagged by the risk engine.",
  owner: "compliance-team",

  source: postgres.table("kyc_cases", {
    primaryKey: "id",
    columns: [
      "id",
      "customer_name",
      "customer_email",
      "document_number",
      "country",
      "risk_score",
      "risk_band",
      "flag_reason",
      "status",
      "submitted_at",
      "reviewed_by",
      "reviewed_at",
      "review_note",
    ],
    searchColumns: ["customer_name", "customer_email"],
  }),

  access: { view: ["kyc-analyst", "compliance-lead"] },

  fields: {
    id: field.id(),
    customer_name: field.text({ label: "Customer", searchable: true }),
    customer_email: field.text({
      label: "Email",
      visibleTo: ["compliance-lead"],
      mask: true,
    }),
    document_number: field.text({
      label: "Document no.",
      visibleTo: ["compliance-lead"],
      mask: true,
    }),
    country: field.text({ label: "Country", filterable: true }),
    risk_score: field.number({
      label: "Risk score",
      filterable: true,
      sortable: true,
      readOnly: true,
    }),
    risk_band: field.enum(["low", "medium", "high"], {
      label: "Risk band",
      filterable: true,
    }),
    flag_reason: field.text({ label: "Flagged for" }),
    status: field.enum(["pending", "escalated", "cleared", "rejected"], {
      label: "Status",
      filterable: true,
    }),
    submitted_at: field.datetime({
      label: "Submitted",
      sortable: true,
      readOnly: true,
    }),
    reviewed_by: field.text({ label: "Reviewed by", readOnly: true }),
    reviewed_at: field.datetime({ label: "Reviewed", readOnly: true }),
    review_note: field.text({ label: "Review note", readOnly: true }),
  },

  list: {
    columns: ["customer_name", "country", "risk_score", "risk_band", "status", "submitted_at"],
    filters: ["status", "risk_band", "country", "risk_score"],
    search: ["customer_name", "customer_email"],
    defaultSort: { field: "risk_score", direction: "desc" },
  },

  detail: {
    layout: [
      ["customer_name", "customer_email"],
      ["document_number", "country"],
      ["risk_score", "risk_band"],
      ["status", "submitted_at"],
      "flag_reason",
      ["reviewed_by", "reviewed_at"],
      "review_note",
    ],
  },

  actions: {
    escalate: {
      label: "Escalate to compliance",
      requires: "kyc-analyst",
      async run(ctx, row) {
        await ctx.db.update(String(row.id), {
          status: "escalated",
          reviewed_by: ctx.user.name,
          reviewed_at: new Date().toISOString(),
        });
      },
    },
    clear: {
      label: "Clear customer",
      requires: "compliance-lead",
      variant: "primary",
      confirm: "Clear this customer? They will be able to transact.",
      async run(ctx, row) {
        await ctx.db.update(String(row.id), {
          status: "cleared",
          reviewed_by: ctx.user.name,
          reviewed_at: new Date().toISOString(),
        });
      },
    },
    reject: {
      label: "Reject",
      requires: "compliance-lead",
      variant: "danger",
      fields: {
        review_note: field.text({ label: "Rejection reason" }),
      },
      async run(ctx, row, input) {
        await ctx.db.update(String(row.id), {
          status: "rejected",
          reviewed_by: ctx.user.name,
          reviewed_at: new Date().toISOString(),
          review_note: String(input.review_note ?? ""),
        });
      },
    },
  },

  audit: true,
});
