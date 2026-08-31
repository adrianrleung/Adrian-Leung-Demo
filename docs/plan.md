# Internal Tools Platform — Prototype Plan

## Framing (important for the presentation)

Do **not** pitch this as "rebuild Power Apps". That invites a comparison you lose:
Microsoft has thousands of engineers, ~1,500 connectors, and a visual designer.

Pitch it as: **an opinionated, config-driven internal-tools framework that covers
the 5–10 apps we actually have, in the stack we already run.**

The constraint that drives every design decision below is the team's own
requirement: *engineers should spend as little time as possible on internal
tools.* So the target is:

> A new internal tool = one config file, ~50 lines, shipped in under a day,
> by an engineer who has never touched the platform before.

If the prototype does not hit that, the answer is "keep buying", and that is a
legitimate and cheap outcome of this exercise.

---

## The 3 real options (put this slide in the deck)

| Option | Up-front | Ongoing | Kills the $250k? | Risk |
|---|---|---|---|---|
| 1. Audit + right-size the Microsoft bill | ~1 week | none | Partially — unknown until we see the invoice | None |
| 2. Self-host Appsmith / Budibase / ToolJet | ~2 weeks | low (upgrades) | Most of the platform portion | Low |
| 3. Build this framework in-house | ~1–2 eng-months to production | permanent ownership | Yes, if spend is platform cost | Medium |

Recommendation: run **1 in parallel with a prototype of 3**, and keep **2** as the
fallback. The prototype's job is to produce a real effort number, not to
pre-commit us.

**Caveat to state out loud:** $250k / 50 people = $5k per person per year.
Power Apps seats are $20/user/month, so seats are at most ~$12k of that bill.
Until we see the invoice breakdown we do not know whether a rebuild removes
$230k or $12k. This is the single biggest open risk in the proposal.

---

## Prototype scope

### In scope

1. **Config-driven app definition**
   A TypeScript `defineApp()` config: data source, columns, filters, row
   actions, permissions. The framework generates list view, detail view,
   forms, and validation. No visual builder.

2. **Pluggable data adapters** (the "plug and play" requirement)
   A small `DataSource` interface — `list / get / create / update` with
   server-side filter + pagination pushed down (i.e. no delegation-limit class
   of bug). Ship two implementations: **Postgres** and **generic REST**.
   Adding a third is a day's work, and that is the thing to demo.

3. **Auth and permissions**
   Entra ID / OIDC SSO reusing existing identity — no new user directory.
   Role-based control over apps, actions, and field visibility.

4. **Actions, approvals, audit log**
   Server-side action handlers, optional two-person approval, append-only
   audit trail of who did what. This is the compliance-relevant part and is
   why KYC is the right first app.

5. **Notification hook** — Teams/Slack on action and approval events.

6. **One real demo app: the KYC review queue**, built entirely on the
   framework, to prove the config-file claim.

### Explicitly out of scope (say this in the deck — scope discipline sells)

- Visual drag-and-drop designer
- Mobile apps and offline support
- Charts and dashboards → embed Metabase/Power BI instead
- Connector marketplace
- Multi-tenancy
- Non-engineer (citizen developer) authoring

That last exclusion is the honest trade: **we are giving up letting business
users build their own apps.** If that is happening today at any real volume,
this plan is wrong and we should stay on Power Apps.

---

## Phases

| Phase | Content | Output |
|---|---|---|
| 0 | Bill audit + inventory of live Power Apps, their users and app owners | The go/no-go number |
| 1 | Framework core: config schema, list/detail/form rendering, Postgres adapter | Runs locally |
| 2 | Auth, RBAC, audit log, action handlers | Demo-able |
| 3 | KYC review queue built on it + REST adapter | The presentation demo |
| 4 (post-decision) | Harden, migrate remaining apps one at a time | Production |

Phases 1–3 are the prototype. Phase 4 only starts if Phase 0's number justifies it.

---

## What the demo shows

1. The KYC queue running: filter, open a case, approve/reject, audit trail,
   Teams notification.
2. Live: add a **new** app (e.g. the refunds view) by writing a config file —
   in front of the audience. This is the whole pitch in 90 seconds.
3. Point a data source at a REST API instead of Postgres by changing one line.
4. Cost slide: prototype effort → extrapolated migration effort → annual
   run cost vs. the portion of $250k it actually removes.

---

## Open questions

1. **Stack** — what does the product run on today (language, framework, DB,
   hosting)? The framework must be boring and identical to it.
2. **App inventory** — how many Power Apps are live, who uses each, and how
   many are maintained by non-engineers?
3. **Deadline** — when is the presentation?
4. **Compliance** — is the KYC app subject to an audit regime that dictates
   data residency or retention?
5. Is a partner/SI currently billing for these apps? (If yes, that is probably
   the bulk of the $250k and none of it is fixed by this project.)
