# Internal Tools Platform — Technical Design

Stack assumption: **Postgres** backend, **Entra ID (Azure AD)** for auth,
TypeScript throughout.

---

## 1. TypeScript config, not YAML

Use a typed TS config, not YAML. Reason: every YAML-config platform eventually
needs conditional logic (`show this field only if status = pending`), and then
you invent an expression language. That is exactly how Power Fx happened, and
it is the thing you are trying to escape.

With TypeScript you get autocomplete, compile-time errors, refactoring, and
real functions inline — for free, in a language your team already knows.
The config is still declarative; it just happens to be type-checked.

---

## 2. What a config looks like

```ts
// apps/kyc-review.app.ts
import { defineApp, postgres, field } from "@internal/platform";

export default defineApp({
  slug: "kyc-review",
  name: "KYC Review Queue",
  icon: "shield-check",

  source: postgres.table("kyc_cases", {
    primaryKey: "id",
    // pushed down to SQL — never filtered client-side
    defaultFilter: { status: "pending" },
    defaultSort: [{ column: "submitted_at", direction: "asc" }],
  }),

  access: {
    view:    ["kyc-analyst", "kyc-lead", "compliance"],
    approve: ["kyc-lead"],                 // Entra ID group names
  },

  fields: {
    id:            field.id(),
    customer_name: field.text({ label: "Customer" }),
    country:       field.enum(COUNTRIES, { filterable: true }),
    risk_score:    field.number({ format: "0.00", sortable: true }),
    status:        field.enum(["pending", "approved", "rejected"]),
    documents:     field.files({ storage: "azure-blob" }),
    ssn:           field.text({ mask: true, visibleTo: ["compliance"] }),
    submitted_at:  field.datetime({ readOnly: true }),
  },

  list: {
    columns: ["customer_name", "country", "risk_score", "submitted_at"],
    filters: ["country", "risk_score"],
    search:  ["customer_name"],
  },

  detail: {
    layout: [
      ["customer_name", "country"],
      ["risk_score", "submitted_at"],
      "documents",
      // escape hatch: a hand-written React component, see §4
      { component: "SanctionsCheckPanel" },
    ],
  },

  actions: {
    approve: {
      label: "Approve",
      requires: "kyc-lead",
      confirm: "Approve this KYC case?",
      // plain server-side TypeScript. no DSL.
      run: async (ctx, case_) => {
        await ctx.db.update("kyc_cases", case_.id, {
          status: "approved",
          approved_by: ctx.user.id,
        });
        await ctx.notify.teams("#compliance",
          `${ctx.user.name} approved KYC for ${case_.customer_name}`);
      },
    },
    reject: {
      label: "Reject",
      requires: "kyc-lead",
      fields: { reason: field.text({ required: true }) },
      run: async (ctx, case_, { reason }) => { /* ... */ },
    },
  },

  audit: true,   // append-only log of every read, action, and field change
});
```

Registration is file-system based: drop the file in `apps/`, it appears in the
nav. No central registry to edit, no merge conflicts between teams.

---

## 3. How it is built

Five components. Nothing exotic — that is the point.

**a. Config layer** — `defineApp()` is just a typed identity function returning
an `AppConfig`. All the leverage is in the types.

**b. Data adapter interface** — the "plug and play" part:

```ts
interface DataSource<T> {
  list(q: Query): Promise<Page<T>>;   // filter/sort/paginate pushed to server
  get(id: string): Promise<T>;
  create(input: Partial<T>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
}
```

Ship `postgres.table()` first, `rest.resource()` second. Because `Query` is
always translated server-side, you structurally cannot hit Power Apps'
delegation bug. Third-party systems (Stripe, Salesforce, an internal service)
each become one small adapter.

**c. Server** — one generic API route per operation, driven by config:
`GET /api/:app/rows`, `POST /api/:app/actions/:name`. It resolves the config,
checks permissions, translates the query, runs the handler, writes the audit
row. Roughly one file.

**d. Renderer** — React. A generic `<ListView>`, `<DetailView>`, `<Form>` that
read the config and a field-type → component registry
(`text → TextField`, `enum → Select`, `files → FileDrop`). Adding a field type
is adding one component to the registry.

**e. Auth** — Entra ID OIDC via NextAuth/MSAL. Group claims from the token map
directly onto the `access` and `requires` keys. No user table, no invite flow,
no offboarding process to build — that is a large amount of work avoided.

---

## 4. The 80/20 escape hatch — the single most important design rule

Every internal-tools platform dies the same death: an app needs one thing the
config cannot express, and the team either forks the platform or abandons it.

So the rule is: **config generates the generic 80%; hand-written React
components fill the app-specific 20%, and they are first-class, not a plugin
API.**

| Config generates (identical in every app) | Hand-write (unique per app) |
|---|---|
| List, filter, sort, pagination, search | Domain widgets (sanctions panel, document viewer) |
| Detail view, forms, validation | Multi-step wizards |
| CRUD wiring | Complex visualisations |
| RBAC enforcement | Anything genuinely bespoke |
| Audit log | |
| Notifications | |
| Nav, layout, theming | |

A custom component receives the row and a typed context and drops into the
layout array — as in `SanctionsCheckPanel` above. No proposal process, no
platform change, no waiting on the platform owner. If 80% of an app needs
escape hatches, that app should not be on the platform at all — and that is a
fine answer.

---

## 5. Where each app should live

The decision rule, in priority order:

1. **Is a non-engineer the author?** → Power Apps. Nothing here replaces that.
2. **Is it engineer-facing or in the deploy path?** (feature flags, runbooks,
   deploy tooling) → build normally, no platform, no Power Apps.
3. **Is it list → inspect → act on records, authored by an engineer?**
   → this platform. KYC queue, refunds review, support admin, ops queues.
4. **Is it charts and reporting?** → neither. Metabase or Power BI.
5. **Does it need mobile, offline, camera, or GPS?** → Power Apps. Genuinely
   good at this and expensive to rebuild.

Realistic end state at 50 people: most apps move, and a small number of
business-user-authored and mobile/offline apps stay on Power Apps. Plan for
coexistence — a proposal that claims the Microsoft bill goes to zero will not
survive scrutiny.

---

## 6. Risks

- **Platform ownership.** Someone owns this forever. At 50 people that is a
  real allocation; name the person in the proposal or it will not be staffed.
- **Scope creep toward a visual builder.** The moment a non-engineer asks to
  author an app, pressure appears to build a designer. That is a 10x scope
  increase. Answer "no" in advance, in writing.
- **Coexistence cost.** Two platforms during migration is temporarily more
  expensive, not less.
- **The bill is still undiagnosed.** $250k / 50 people = $5k per head per year
  against a $20/user/month product. Until the invoice is broken down, the
  savings figure in the deck is a guess.
