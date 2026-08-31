-- Application tables for the demo tool.
CREATE TABLE IF NOT EXISTS refund_requests (
  id             bigserial PRIMARY KEY,
  customer_name  text        NOT NULL,
  customer_email text        NOT NULL,
  amount         numeric(12,2) NOT NULL,
  currency       text        NOT NULL DEFAULT 'USD',
  reason         text        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending',
  risk_flag      text        NOT NULL DEFAULT 'low',
  requested_at   timestamptz NOT NULL DEFAULT now(),
  decided_by     text,
  decided_at     timestamptz,
  decline_reason text
);

-- Every field declared filterable or sortable in a config needs an index.
-- CI checks this correspondence so "filterable" never means "slow table scan".
CREATE INDEX IF NOT EXISTS refund_requests_status_idx    ON refund_requests (status);
CREATE INDEX IF NOT EXISTS refund_requests_risk_idx      ON refund_requests (risk_flag);
CREATE INDEX IF NOT EXISTS refund_requests_amount_idx    ON refund_requests (amount);
-- Composite index matching the keyset pagination tuple (sort column, pk).
CREATE INDEX IF NOT EXISTS refund_requests_keyset_idx    ON refund_requests (requested_at DESC, id DESC);

-- Append-only audit trail.
CREATE TABLE IF NOT EXISTS audit_log (
  id         bigserial PRIMARY KEY,
  app        text        NOT NULL,
  row_id     text        NOT NULL,
  actor_id   text        NOT NULL,
  actor_name text        NOT NULL,
  event      text        NOT NULL,
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_app_row_idx ON audit_log (app, row_id, created_at DESC);

-- Immutability is enforced by the database, not by convention. In production
-- the application connects as `app_user`, which is never granted UPDATE or
-- DELETE on this table.
--
--   CREATE ROLE app_user LOGIN;
--   GRANT SELECT, INSERT ON audit_log TO app_user;
--   REVOKE UPDATE, DELETE ON audit_log FROM app_user;
