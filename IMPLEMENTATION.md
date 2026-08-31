# Internal Tools Platform — Implementation Notes

A prototype of an in-house replacement for the internal tools currently built
on Microsoft Power Apps.

---

## 1. Why this exists

Current spend is ~$250k/yr across 50 people (~$5k per head per year). Power
Apps seat licensing is $20/user/month, so licences account for at most ~5% of
that bill — **the rest is undiagnosed and should be broken down before any
migration decision is made.** See §8.

Separately, Power Apps has structural problems that this design removes:

| Power Apps problem | Fix here |
|---|---|
| Delegation: a non-delegable query silently returns the first 500–2,000 rows and *wrong results* | All filtering is pushed to the data source. Declaring a filter the adapter cannot execute is a **build error**. §4 |
| Weak testing (Test Studio); apps tested by hand | Generic renderer + generic API tested once; per-app surface is a config file and pure functions. §6 |
| Unreviewable generated-XML diffs | Apps are short `.ts` files reviewed as normal PRs |
| Per-seat licensing scaling with headcount | Self-hosted; cost flat in user count |
| API entitlements and throttling | Own infrastructure, no vendor quota |
| Vendor lock-in | React over Postgres; any app can be lifted out individually |

The premise that makes this viable: **the company is all engineers.** Power
Apps' citizen-developer value proposition, which is most of what the licence
buys, is unused here.

---

## 2. Scope

**In:** config-driven app definition, Postgres adapter with full server-side
query pushdown, generic list/detail/action UI, role-based access with
field-level masking, append-only audit log, one real demo app.

**Out, deliberately:**
- **A platform meta-UI / app console.** Git is the registry.
- **A visual drag-and-drop builder.** Engineers author apps. This is a
  permanent decision, not a phase-2 item — a designer is a 10x scope increase
  and turns a maintenance-light framework into a product with a roadmap.
- Mobile, offline, charts (embed Metabase/Power BI), multi-tenancy.

---

## 3. Stack

TypeScript end to end: Next.js 15 (App Router), React 19, Postgres via `pg`,
Tailwind, Vitest.

**No Python in the app layer.** One config file is simultaneously the API
contract, the query shape, the permission rules, and the UI definition, checked
by one type checker. Splitting across a Python backend duplicates the schema
and loses the build-time check in §4 — most of the value. Python remains the
right home for real computation (risk scoring, reconciliation, ML), called from
an action handler over HTTP.

---

## 4. The delegation fix (the core technical argument)

`DataSource` accepts a structured `Query` and every adapter must translate all
of it server-side. Each adapter publishes its `capabilities`, and
`validateApp()` checks the config against them **at import time**, so a bad
config fails `next build` and CI.

```ts
// src/platform/define-app.ts
cannot filter "amount" (money) server-side: postgres does not support [gte, lte].
Filtering it in the browser would silently truncate results, so this is a build error.
```

There is no client-side filtering code anywhere in the platform, so the Power
Apps failure mode has no path to occur. Pagination is **keyset**
(`WHERE (sort_col, id) > (?, ?)`), not `OFFSET`, so page 5,000 costs the same
as page 1. The row count shown in the UI is a real `COUNT(*)` from Postgres.

Backing index requirements are in `db/schema.sql`, including a composite index
matching the keyset tuple.

---

## 5. File map

```
src/platform/
  types.ts          Query, Page, Capabilities, DataSource, FieldDef, AppConfig
  define-app.ts     defineApp() + validateApp() — the build-time capability check
  fields.ts         field.text/money/enum/... constructors
  users.ts          User, roles, hasRole (client-safe)
  auth.ts           currentUser() — cookie stub for Entra ID (server-only)
  server.ts         query parsing, app authorisation, field-visibility stripping
  actions.ts        server-side action execution + audit write
  audit.ts          append-only audit log reader/writer
  registry.ts       the app list (one line per app)
  view-model.ts     serialisable config projection for client components
  adapters/
    postgres.ts     SQL translation, keyset pagination, exact count
  __tests__/        capability validation + field visibility

src/components/
  list-view.tsx     generic list screen for every app
  detail-view.tsx   generic detail screen + action modal
  field-display.tsx field-kind -> renderer registry (plugin point)
  role-switcher.tsx prototype-only Entra stand-in

src/apps/
  refunds.app.ts    the entire demo tool — one file

src/app/
  [app]/page.tsx           list route
  [app]/[id]/page.tsx      detail route
  api/[app]/rows           the list API for every app
  api/[app]/actions/[a]    the action API for every app

db/
  schema.sql        tables, indexes, audit immutability grants
  seed.ts           1,200 seeded refund requests
```

Three API routes total, for any number of apps. A permissions fix is fixed
everywhere at once, and the security-critical path is tested once.

---

## 6. Testing model — the strongest argument in the proposal

Three layers, and **QA effort is constant in the number of apps, not linear**:

1. **Platform tests.** The query translator, capability validation,
   authorisation and field-visibility stripping are tested once
   (`src/platform/__tests__`). Every app inherits that coverage.
2. **Adapter contract suite.** One shared suite every `DataSource` must pass
   (filter operators, pagination boundaries, sort stability, empty results).
   A new adapter is done when it goes green. *Not yet written — see §7.*
3. **Per-app.** Action handlers are plain async TypeScript and unit-test with
   no framework, no emulator, no UI. Plus a Playwright smoke test generated
   from each config (load list → apply each declared filter → open first row →
   assert declared columns render). *Not yet written — see §7.*

Contrast: Power Apps' Test Studio is limited and most teams end up testing
every canvas app by hand, so adding the 12th app adds 12th-app QA cost.

---

## 7. Status

**Built and passing `typecheck` / `lint` / `test` / `build`:**
- Config layer, field constructors, build-time capability validation (6 tests)
- Postgres adapter: operator pushdown, ILIKE search, keyset pagination,
  exact count, parameterised SQL with column whitelisting
- Generic list view (server-side filters, search, pagination)
- Generic detail view, action modal with declared inputs
- Role-based app access, action authorisation re-checked server-side,
  field-level masking by payload stripping (2 tests)
- Append-only audit log with activity timeline
- `refunds` demo app, 1,200 seeded rows

**Not built (ordered by value):**
1. Adapter contract test suite (§6.2) — needed before a second adapter
2. Generated per-app Playwright smoke tests (§6.3)
3. REST adapter — proves "plug and play" beyond one data source
4. Real Entra ID OIDC to replace the cookie stub in `auth.ts`
5. CI check: every `filterable`/`sortable` field has a backing index
6. CI check: every `apps/*.app.ts` has a CODEOWNERS owner
7. Plugin packaging (field types, adapters, effects as installable modules)
8. Teams webhook (currently `console.info` in `actions.ts`)

---

## 8. Open questions for the decision

1. **What is actually in the $250k?** Most likely Dynamics 365 licences,
   Dataverse capacity, Power Pages per-visitor pricing, or an SI retainer. If
   it is an SI retainer or D365, this project does not touch it. This is the
   question most likely to be asked in the room, and it is not yet answered.
2. **Who owns the platform permanently?** Name them or it will not be staffed.
3. **How many existing apps need mobile, offline, camera or GPS?** Those stay
   on Power Apps. Plan for coexistence — the Microsoft bill does not go to zero.

---

## 9. Running it

```bash
docker run -d --name devin-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=internal_tools postgres:16-alpine

npm install
npm run db:seed        # schema + 1,200 rows
npm run dev            # http://localhost:3000 -> /refunds

npm run typecheck && npm run lint && npm test
```

`DATABASE_URL` overrides the default connection string.

### Adding an app

Write `src/apps/<name>.app.ts` and add one line to `src/platform/registry.ts`.
`src/apps/refunds.app.ts` is the complete reference — ~120 lines including both
action handlers, and the only non-declarative parts are the two `run` functions.

### Demoing the two arguments

- **Delegation:** mark a field `filterable` on an adapter lacking the operator,
  or remove `filterable` from `status` in `refunds.app.ts`, then `npm run
  build` — it fails with a named error instead of shipping wrong results.
- **Permissions:** switch the role selector from Adrian Leung (finance-lead) to
  Sam Okafor (support-agent). Action buttons disable, and `customer_email`
  arrives masked **in the API payload**, not merely hidden in the UI.
