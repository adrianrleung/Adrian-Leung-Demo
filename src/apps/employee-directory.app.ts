import { defineApp } from "@/platform/define-app";
import { field } from "@/platform/fields";
import { postgres } from "@/platform/adapters/postgres";

/**
 * Internal employee directory for a ~60-person startup. Demonstrates the
 * people-data shape: everyone can look colleagues up, but contact details and
 * compensation are stripped from the API response for anyone outside People
 * Ops, and lifecycle changes (leave, offboarding, pay) are role-gated actions
 * with an audit trail.
 */
export default defineApp({
  slug: "employee-directory",
  name: "Employee Directory",
  description: "Who works here, on which team, and reporting to whom.",
  owner: "people-ops",

  source: postgres.table("employees", {
    primaryKey: "id",
    columns: [
      "id",
      "employee_number",
      "full_name",
      "work_email",
      "personal_email",
      "phone",
      "job_title",
      "department",
      "team",
      "manager",
      "location",
      "employment_type",
      "status",
      "start_date",
      "end_date",
      "salary",
      "equity_options",
      "note",
      "updated_by",
      "updated_at",
    ],
    searchColumns: ["full_name", "work_email", "job_title", "team"],
  }),

  access: { view: ["employee", "people-ops-admin"] },

  fields: {
    id: field.id(),
    employee_number: field.text({ label: "Employee no.", searchable: true }),
    full_name: field.text({ label: "Name", searchable: true }),
    work_email: field.text({ label: "Work email", searchable: true }),
    personal_email: field.text({
      label: "Personal email",
      visibleTo: ["people-ops-admin"],
      mask: true,
    }),
    phone: field.text({
      label: "Phone",
      visibleTo: ["people-ops-admin"],
      mask: true,
    }),
    job_title: field.text({ label: "Title", searchable: true }),
    department: field.enum(
      ["Engineering", "Product", "Design", "Sales", "Marketing", "Operations", "People", "Finance"],
      { label: "Department", filterable: true },
    ),
    team: field.text({ label: "Team", filterable: true, searchable: true }),
    manager: field.text({ label: "Manager", filterable: true }),
    location: field.enum(["Lisbon", "London", "Berlin", "Remote (EU)", "New York"], {
      label: "Location",
      filterable: true,
    }),
    employment_type: field.enum(["full-time", "part-time", "contractor", "intern"], {
      label: "Employment type",
      filterable: true,
    }),
    status: field.enum(["active", "on-leave", "notice-period", "departed"], {
      label: "Status",
      filterable: true,
    }),
    start_date: field.datetime({ label: "Start date", sortable: true }),
    end_date: field.datetime({ label: "End date", readOnly: true }),
    salary: field.money({
      label: "Salary",
      currency: "EUR",
      visibleTo: ["people-ops-admin"],
      mask: true,
      readOnly: true,
    }),
    equity_options: field.number({
      label: "Options granted",
      visibleTo: ["people-ops-admin"],
      mask: true,
      readOnly: true,
    }),
    note: field.text({ label: "Note", readOnly: true }),
    updated_by: field.text({ label: "Last changed by", readOnly: true }),
    updated_at: field.datetime({ label: "Last changed", readOnly: true }),
  },

  list: {
    columns: ["full_name", "job_title", "department", "team", "location", "status", "start_date"],
    filters: ["department", "team", "location", "employment_type", "status", "manager"],
    search: ["full_name", "work_email", "job_title", "team"],
    defaultSort: { field: "start_date", direction: "desc" },
  },

  detail: {
    layout: [
      ["full_name", "employee_number"],
      ["job_title", "department"],
      ["team", "manager"],
      ["location", "employment_type"],
      ["work_email", "phone"],
      "personal_email",
      ["status", "start_date"],
      ["salary", "equity_options"],
      "end_date",
      "note",
      ["updated_by", "updated_at"],
    ],
  },

  create: {
    fields: [
      "employee_number",
      "full_name",
      "work_email",
      "personal_email",
      "phone",
      "job_title",
      "department",
      "team",
      "manager",
      "location",
      "employment_type",
      "start_date",
    ],
    requires: "people-ops-admin",
    defaults: (user) => ({
      status: "active",
      updated_by: user.name,
      updated_at: new Date().toISOString(),
    }),
  },

  actions: {
    start_leave: {
      label: "Mark on leave",
      requires: "people-ops-admin",
      fields: {
        note: field.text({ label: "Leave note (e.g. parental leave to March)" }),
      },
      async run(ctx, row, input) {
        await ctx.db.update(String(row.id), {
          status: "on-leave",
          note: String(input.note ?? ""),
          updated_by: ctx.user.name,
          updated_at: new Date().toISOString(),
        });
      },
    },
    return_from_leave: {
      label: "Back from leave",
      requires: "people-ops-admin",
      variant: "primary",
      async run(ctx, row) {
        await ctx.db.update(String(row.id), {
          status: "active",
          note: null,
          updated_by: ctx.user.name,
          updated_at: new Date().toISOString(),
        });
      },
    },
    offboard: {
      label: "Offboard",
      requires: "people-ops-admin",
      variant: "danger",
      confirm: "Offboard this employee? Access revocation is triggered on their last day.",
      fields: {
        end_date: field.datetime({ label: "Last day" }),
        note: field.text({ label: "Reason" }),
      },
      async run(ctx, row, input) {
        await ctx.db.update(String(row.id), {
          status: "notice-period",
          end_date: String(input.end_date ?? new Date().toISOString()),
          note: String(input.note ?? ""),
          updated_by: ctx.user.name,
          updated_at: new Date().toISOString(),
        });
      },
    },
  },

  audit: true,
});
