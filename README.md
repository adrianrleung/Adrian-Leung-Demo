# Internal Tools Platform

Config-driven framework for internal tools: one TypeScript config file per app
generates the list/detail/form UI, API, permissions, and audit log. See
`IMPLEMENTATION.md` for architecture and design decisions.

## Run locally

```bash
# 1. Dependencies (Node 20+, Docker)
npm install
docker run -d --name devin-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=internal_tools postgres:16-alpine

# 2. Schema + demo data (1,200 rows)
npm run db:seed

# 3. Run — http://localhost:3000/refunds
npm run dev
```

Checks: `npm run lint && npm run typecheck && npm test && npm run build`

## Add an app

```bash
npm run new-app -- expense-requests   # config + migration + registry entry
psql "$DATABASE_URL" -f db/migrations/expense-requests.sql
```

Edit `src/apps/expense-requests.app.ts` (fields, roles, actions — see
`src/apps/refunds.app.ts` for the full reference) and the app is live at
`/expense-requests`.

## Deploy (Docker + Kubernetes, one deployment per app)

```bash
docker build -f deploy/Dockerfile -t internal-tools/refunds .

kubectl create secret generic postgres-secrets --from-literal=password=postgres
kubectl create secret generic refunds-secrets \
  --from-literal=database-url=postgres://postgres:postgres@postgres:5432/internal_tools
kubectl apply -f deploy/k8s/postgres.yaml -f deploy/k8s/refunds.yaml
```

New app: copy `deploy/k8s/refunds.yaml`, rename, deploy.

## Real sign-in (Entra ID)

Local demo uses a role switcher (`AUTH_MODE=demo`, the default). For SSO set:

```bash
AUTH_MODE=entra AUTH_SECRET=<random-32-bytes>
AZURE_TENANT_ID=... AZURE_CLIENT_ID=... AZURE_CLIENT_SECRET=...
ENTRA_GROUP_ROLE_MAP='{"<entra-group-object-id>":"finance-lead"}'
```

Tenant setup and details: `IMPLEMENTATION.md` §10. Audit-log immutability
grants: `db/grants.sql`.
