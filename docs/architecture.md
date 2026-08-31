# Internal Tools Platform — Architecture & Interface

Stack: TypeScript, Next.js (App Router), Postgres, Entra ID (OIDC).

This document covers (1) the architectural decisions and why, (2) what the
interface actually looks like, and (3) how each specific Power Apps failure
mode is designed out.

---

# Part 1 — Architectural decisions

Each decision is stated with the alternative that was rejected, because the
rejected option is usually the one someone will raise in the room.

### AD-1. Config is TypeScript, not YAML

**Decision:** apps are `.app.ts` files exporting a typed `defineApp({...})`.

**Rejected:** YAML/JSON config.

**Why:** every declarative config platform eventually needs conditional logic
— "show this field only when status is pending", "this action is disabled for
closed cases". YAML forces you to invent an expression language to express it.
That is precisely how Power Fx came to exist, and inventing a worse Power Fx
is the single most likely way this project fails.

TypeScript gives conditionals, autocomplete, compile-time validation, safe
refactoring, and go-to-definition for free, in a language the team already
writes daily. The config stays declarative in shape; it is just type-checked.

**Consequence:** non-engineers cannot author apps. Accepted explicitly —
see AD-7.

---

### AD-2. Queries are always pushed to the data source; partial support is a build error

**Decision:** the `DataSource` interface accepts a structured `Query`
(filters, sort, pagination, search) and every adapter must translate all of it
into a server-side query. Each adapter declares its capabilities, and the
config is validated against them **at build time**.

```ts
interface DataSource<T> {
  capabilities: Capabilities;              // which operators it supports
  list(q: Query): Promise<Page<T>>;        // must be fully server-side
  get(id: string): Promise<T>;
  create(input: Partial<T>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
}
```

**Rejected:** fetching rows and filtering in the client "when the adapter can't
do it" — i.e. Power Apps' behaviour.

**Why:** this is the direct fix for the delegation bug. If you mark a field
`filterable: true` and the adapter cannot filter on it server-side, CI fails
with a named error. There is no runtime path that silently returns the first
500 rows, because there is no client-side filtering code to fall back to.
The failure mode moves from *silently wrong results in production* to *red
build*.

**Also:** pagination is keyset (`WHERE (sort_col, id) > (?, ?)`), not `OFFSET`,
so page 5,000 costs the same as page 1.

---

### AD-3. One generic API surface, driven by config at runtime

**Decision:** three routes total, not three per app:

```
GET  /api/:app/rows            list + filter + sort + paginate
GET  /api/:app/rows/:id        detail
POST /api/:app/actions/:name   invoke an action
```

The handler loads the app config, authorises, translates the query, executes,
and writes the audit row.

**Rejected:** code-generating a bespoke API per app.

**Why:** generated code has to be regenerated, reviewed, and kept in sync, and
it multiplies the security-relevant surface by the number of apps. With one
generic handler, a permissions fix is fixed everywhere at once — and, crucially
for the testing story, the security-critical path is a single code path that
gets tested once (see AD-5).

---

### AD-4. Authorisation is enforced server-side, derived from Entra group claims

**Decision:** `access` and `requires` in config name Entra ID groups. The
server resolves them from the OIDC token on every request. Field-level
visibility (`visibleTo`) is applied by **stripping fields from the response
payload**, not by hiding them in the UI.

**Rejected:** a platform-local users/roles table.

**Why:** no user directory to build, no invite flow, no offboarding process —
when someone leaves, Entra removes them and access disappears everywhere. This
is one of the genuinely large chunks of work Power Apps was doing for you, and
it is worth explicitly reproducing rather than hand-rolling.

Stripping rather than hiding matters: a masked SSN that is present in the JSON
is a compliance finding waiting to happen.

---

### AD-5. Test the platform once; generate smoke tests per app

**Decision:** three layers.

1. **Platform tests** — `ListView`, `DetailView`, `Form`, the query
   translator, and the authorisation middleware are tested thoroughly, once.
   Every app inherits that coverage.
2. **Adapter contract suite** — a single shared test suite that every
   `DataSource` implementation must pass (filter operators, pagination
   boundaries, sort stability, empty results, permission errors). A new
   adapter is "done" when it goes green.
3. **Per-app tests** — action handlers are plain async TypeScript functions,
   so they unit-test normally with no framework, no emulator, no UI. Plus an
   auto-generated Playwright smoke test per app derived from its config
   (load list → apply each declared filter → open first row → assert each
   declared column renders).

**Why this is the strongest argument in the whole proposal:** Power Apps'
testing story is weak (Test Studio is limited, and most teams end up testing
canvas apps by hand). Here, testing effort is **constant in the number of
apps** rather than linear, because the app-specific surface is a config file
and a handful of pure functions. Adding the 12th app adds essentially no
manual QA.

---

### AD-6. Apps are files in the product repo; ownership is enforced by CODEOWNERS

**Decision:** `apps/*.app.ts` live in a normal Git repo, reviewed as normal
pull requests, with `CODEOWNERS` requiring a named owner per app. A CI check
fails if an app file has no owner.

**Rejected:** a database-backed app registry with a management UI.

**Why:** it fixes two Power Apps problems at once. Review becomes a real diff
of readable code instead of a noisy generated-XML diff. And sprawl becomes
structurally impossible to ignore — the "hundreds of unowned apps built by
someone who left" problem is exactly an ownership-tracking problem, and Git
already solved it.

---

### AD-7. No visual builder. Ever.

**Decision:** engineers author apps. Non-engineers do not.

**Why:** a drag-and-drop designer is a 10x scope increase and turns a
weekend-maintenance framework into a product with its own roadmap. The stated
goal is to spend *less* engineering time on internal tools.

**Consequence, to state on stage:** any app currently authored by a
non-engineer stays on Power Apps. If that is most of them, this project should
not happen. Get that number before presenting.

---

### AD-8. Escape hatches are first-class

**Decision:** any layout slot can be a hand-written React component receiving
the typed row and context. No plugin API, no registration, no platform change.

**Why:** the standard death of an internal platform is an app needing one thing
the config cannot express, followed by a fork or an abandonment. Making the
escape hatch ordinary means the platform never has to be "finished".

**Heuristic:** if an app is >20% escape hatches, it does not belong on the
platform. That is a healthy answer, not a failure.

---

### AD-9. Boring, standard, disposable technology

**Decision:** Next.js + Postgres + React, deployed exactly like the main
product. No proprietary runtime, no bespoke DSL, no separate infrastructure.

**Why:** the exit cost must stay near zero. If this platform turns out to be a
mistake, each app is a React page over Postgres and can be lifted out
individually. Contrast with Power Apps, where the exit cost is a full rewrite —
which is the position you are in right now, and the whole reason for this
exercise. Do not recreate the trap in-house.

---

# Part 2 — What the interface looks like

Three screens plus a modal. That is the entire platform UI.

### Shell

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⬡ Internal Tools          🔍 search apps        adrian ▾  [Lead ▾]  │
├────────────────┬─────────────────────────────────────────────────────┤
│ COMPLIANCE     │                                                     │
│  ▸ KYC Review  │                  ( app content )                    │
│  ▸ Sanctions   │                                                     │
│ FINANCE        │                                                     │
│  ▸ Refunds     │                                                     │
│ SUPPORT        │                                                     │
│  ▸ Accounts    │                                                     │
└────────────────┴─────────────────────────────────────────────────────┘
```

Nav is generated from the `apps/` directory and filtered by the user's Entra
groups — you only see apps you can access. The role pill (top right) exists
only in the prototype, to demo permission differences without a live tenant.

### List view — generated entirely from `list: {}`

```
┌──────────────────────────────────────────────────────────────────────┐
│  KYC Review Queue                                    [ ⤓ Export CSV ] │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 customer name    Country ▾   Risk ▾   Status: Pending ▾      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Customer            Country    Risk    Submitted        │           │
│  ─────────────────────────────────────────────────────────────────   │
│  Maria Ferreira      PT         8.40    2h ago           →           │
│  Ken Adachi          JP         3.10    5h ago           →           │
│  Ana Sousa           BR         9.10    1d ago           →           │
│                                                                       │
│  Showing 1–25 of 1,284                        [ Load more ]           │
└──────────────────────────────────────────────────────────────────────┘
```

Every filter here is translated to SQL. "1,284" is a real `COUNT` from the
database, not the size of a truncated client-side buffer — the distinction
that Power Apps gets wrong.

### Detail view — generated from `detail.layout`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Queue     Maria Ferreira            [ Reject ]  [ Approve ]        │
│                                                                       │
│  Customer     Maria Ferreira      Country     Portugal                │
│  Risk score   8.40                Submitted   31 Aug 2025, 09:12      │
│  SSN          •••-••-••••         (visible to compliance)             │
│                                                                       │
│  Documents    [passport.pdf]  [utility-bill.pdf]                      │
│                                                                       │
│  ┌─ SanctionsCheckPanel ──────────── (hand-written component) ─────┐  │
│  │  3 potential matches · highest confidence 62%                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ── Activity ──────────────────────────────────────────────────────   │
│  09:14  adrian viewed case                                            │
│  09:12  system  case created from signup #44812                       │
└──────────────────────────────────────────────────────────────────────┘
```

Action buttons render only if the user's groups satisfy `requires` — and the
server re-checks independently, so a hidden button is a convenience, not the
control.

### Action modal — generated from `actions.<name>.fields`

```
┌───────────────────────────────────┐
│  Reject KYC case                  │
│  Reason *                         │
│  ┌───────────────────────────────┐│
│  │                               ││
│  └───────────────────────────────┘│
│           [ Cancel ]  [ Reject ]  │
└───────────────────────────────────┘
```

On success: DB write, append-only audit row, Teams notification — all from the
`run` handler, all plain TypeScript.

### Developer interface

```bash
$ npx platform new kyc-review     # scaffolds apps/kyc-review.app.ts
$ npm run dev                     # app appears in nav on save
$ npm test                        # platform tests + generated app smoke tests
```

Ship a new tool = write one file, open one PR.

---

# Part 3 — Power Apps failure modes, addressed

| Power Apps problem | How this design removes it |
|---|---|
| **Delegation / silent truncation** — non-delegable query returns first 500–2,000 rows and wrong results | AD-2: all filtering is server-side by construction; unsupported filter = build failure, never a silent partial result |
| **Performance at row count** | Keyset pagination; config-declared `filterable`/`sortable` fields drive an index check in CI |
| **Weak testing (Test Studio)** | AD-5: platform tested once, adapter contract suite, action handlers are pure functions, per-app smoke tests auto-generated from config. QA effort constant, not linear, in app count |
| **Unreviewable diffs (generated XML/YAML)** | AD-6: apps are short, readable `.ts` files; ordinary PR review |
| **Poor concurrent editing / component locking** | Plain text files and Git merges; no environment-level lock |
| **Per-seat licensing that scales with headcount** | Self-hosted; cost is one container and a Postgres database, flat in user count |
| **API request entitlements and throttling** | Your own infrastructure; no vendor quota |
| **App sprawl and unowned apps** | AD-6: CODEOWNERS entry required, CI fails without an owner |
| **Vendor lock-in** | AD-9: React over Postgres; any app can be extracted individually |
| **Copilot-generated formulas that don't scale** | No DSL to generate badly; TypeScript + CI catch it |

### What is honestly *worse* than Power Apps

Say these out loud in the presentation — a proposal with no downsides reads as
a sales pitch and gets picked apart.

1. **Non-engineers cannot build apps.** The biggest genuine loss.
2. **No mobile app, offline, camera, or GPS.** Rebuilding these is expensive;
   apps needing them stay on Power Apps.
3. **Someone owns this forever.** Name them in the proposal or it won't be
   staffed.
4. **No connector ecosystem.** Each integration is a small adapter you write.
5. **Coexistence is temporarily more expensive**, not less. The Microsoft bill
   does not go to zero.
6. **The $250k is still undiagnosed.** $5k per person per year against a
   $20/user/month product means seats are ~5% of the bill. Until the invoice
   is broken down, any savings figure in the deck is a guess — and that is the
   question most likely to be asked.
