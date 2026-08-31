-- Database-enforced audit immutability.
--
-- The application connects as `app_user`, which can read and append to the
-- audit log but can never UPDATE or DELETE it — so a compromised app server
-- or leaked app credential cannot rewrite history. Admin/migration
-- credentials stay separate (vaulted, used only by migrations).
--
-- Apply as a superuser/migration role:
--   psql "$ADMIN_DATABASE_URL" -f db/grants.sql
-- then point DATABASE_URL at app_user.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'change-me';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE internal_tools TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- Append-only audit log.
GRANT SELECT, INSERT ON audit_log TO app_user;
GRANT USAGE ON SEQUENCE audit_log_id_seq TO app_user;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM app_user;

-- Normal read/write on app tables.
GRANT SELECT, INSERT, UPDATE ON refund_requests TO app_user;
GRANT USAGE ON SEQUENCE refund_requests_id_seq TO app_user;
