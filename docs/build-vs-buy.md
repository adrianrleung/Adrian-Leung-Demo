# Internal Tools: What We Built and Build-vs-Buy Recommendation

## Context and assumptions

- We are a ~50-person fintech startup spending ~$250k/yr on Power Apps and related services, with ~10 more internal apps expected.
- We do not want to spend engineering time on internal tools — the product comes first. Internal tools must be fast to build and near-zero to maintain.
- Almost everyone is an engineer. Power Apps' core value proposition — drag-and-drop authoring by non-engineers — is capability we pay for and do not use.

## What we built

A small TypeScript framework where **a new internal app is one typed config file** (~50 lines) plus a SQL migration. The framework generates the entire app from the config: list view (filter/search/sort), detail view, submit forms, actions (approve/decline/etc.), role-based access, PII field masking, and an append-only audit trail.

Working demo: a refunds review app (`/refunds`) — employee submits a refund request, finance lead reviews and approves/declines, every action lands in an immutable audit log. Verified end-to-end in the browser and deployed on a real Kubernetes cluster.

What exists today:

| Capability | Status |
|---|---|
| Config-driven list / detail / create-form UI | Built, tested |
| Role-based access, server-side field masking | Built, tested |
| Row-level access filters (e.g. "only rows assigned to me") | Built, tested |
| Append-only audit log (DB grants prevent tampering) | Built, tested |
| CSRF protection + per-user rate limiting | Built, tested |
| Entra ID SSO (group → role mapping), demo-mode fallback | Built, unit-tested; live tenant login not yet exercised |
| Scaffold CLI (`npm run new-app -- <slug>`) | Built |
| Per-app Docker image + Kubernetes manifests | Built, deployed to a local cluster |
| Plugin registries (custom field types, adapters, actions, layouts) | Designed; extension points exist, no plugins yet (e.g. receipt/file upload) |

## Architectural decisions

1. **Typed config as the single contract.** One TypeScript file simultaneously defines the UI, API shape, permissions, and audit behavior — checked by the compiler. No YAML DSL, no expression language: misconfigurations are build failures, not runtime surprises.
2. **No platform meta-UI.** Git is the app registry; adding an app is a file + one import line. We deliberately did not rebuild Power Apps' management console — engineers have repos and code review.
3. **One language, one process.** Next.js + TypeScript end-to-end (no separate Python backend), so the config's types flow from database to browser without duplicated schemas. Heavy computation, if ever needed, lives in a separate service called from an action.
4. **Security enforced server-side, at the lowest sensible layer.** RBAC, field masking, and row filters are applied on the server before serialization; audit immutability is a Postgres grant (the app role *cannot* UPDATE/DELETE audit rows), not a code convention.
5. **One auth seam.** Everything reads identity through `currentUser()`, so demo mode (local/CI) and Entra SSO (production) swap via one env var with zero app changes. SSO is default-on for every app.
6. **N containers, one per app.** Each app builds its own image from a shared template and deploys independently. Rationale: these apps are write-once ("once it works it works"), so isolation beats shared-deploy convenience. Deploys use the exact same Docker/K8s workflow as the product — ops learns nothing new.
7. **Extensibility via registries, not forks.** New field types (e.g. photo/receipt upload), data adapters, and action effects plug in once and become available to every app config.

## Trade-offs vs Power Apps (honest)

**What we gave up:**
- No drag-and-drop builder or app-management UI — irrelevant given an all-engineer team, but a real loss if non-engineers ever need to author apps.
- No native mobile shell or offline sync — the genuinely hard Power Apps feature. Our apps are web apps; no current internal workflow needs offline.
- Less out-of-the-box: connectors, OCR, approvals templates all exist in Power Apps today; here, anything beyond the generic shape is a plugin an engineer writes.
- We own the security surface (though the hardening — SSO, CSRF, rate limiting, immutable audit, masking — is built and tested).

**What we gained:**
- ~$250k/yr recurring cost cut to zero marginal licence cost. Build cost: roughly one engineer-month total (much of it already done); ongoing ownership ~5–10% of one engineer.
- New app in under a day instead of a licensing/authoring exercise; the 11th app is nearly free.
- Standard Git/Docker/K8s workflow — code review, CI, rollback, audit — instead of a separate ALM world.
- Full control of PII, audit, and data locality in our own infra, which matters for a fintech.

## Build-vs-buy recommendation

Decision rule for any internal app, in order:

1. **Buy a SaaS product** when the process is a commodity with compliance/integration surface we don't want to own (card feeds, tax rules, ticketing SLAs, payroll). Examples: IT service desk → Jira Service Management (~$3k/yr); HR systems → Workday/BambooHR. The vendor absorbs the domain upkeep; this is money well spent.
2. **Build on the framework** when the tool touches *our* data model or domain logic — our ledger, risk scores, customer records — because no vendor sells our data model. Examples: refund review, KYC/risk review queues, internal ops/admin CRUD, access-request approvals. This is where our ~10 upcoming apps mostly live, and where the framework's marginal cost (~a day per app) wins outright.
3. **Power Apps: retire.** With an all-engineer team, its citizen-developer premium buys nothing we use. Keep existing apps running only until migration or licence renewal makes retiring them worthwhile — the $250k line trends to zero as apps move, no big-bang migration required.

Boundary case — expenses: a mature market (Concur) exists, but at our size we use almost none of what it sells (card reconciliation, VAT rules, OCR, accounting export). Recommendation: build the barebones expenses board on the framework now (the only missing piece is a receipt-image upload plugin, ~1–2 days), and revisit buying only when finance starts burning real hours on reconciliation or multi-country tax compliance.

**Bottom line:** buy commodity workflows, build proprietary-data tools on the framework, and let Power Apps expire. The framework pays for itself against the current bill within the first quarter even if only half the apps migrate.
