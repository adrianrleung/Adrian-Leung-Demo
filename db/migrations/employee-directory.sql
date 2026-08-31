-- Table for the Employee Directory app. Apply with:
--   psql "$DATABASE_URL" -f db/migrations/employee-directory.sql
CREATE TABLE IF NOT EXISTS employees (
  id              bigserial PRIMARY KEY,
  employee_number text        NOT NULL UNIQUE,
  full_name       text        NOT NULL,
  work_email      text        NOT NULL UNIQUE,
  personal_email  text,
  phone           text,
  job_title       text        NOT NULL,
  department      text        NOT NULL,
  team            text        NOT NULL,
  manager         text,
  location        text        NOT NULL,
  employment_type text        NOT NULL DEFAULT 'full-time',
  status          text        NOT NULL DEFAULT 'active',
  start_date      timestamptz NOT NULL DEFAULT now(),
  end_date        timestamptz,
  salary          numeric(12,2),
  equity_options  integer,
  note            text,
  updated_by      text,
  updated_at      timestamptz
);

-- One index per field the config declares filterable or sortable.
CREATE INDEX IF NOT EXISTS employees_department_idx ON employees (department);
CREATE INDEX IF NOT EXISTS employees_team_idx       ON employees (team);
CREATE INDEX IF NOT EXISTS employees_location_idx   ON employees (location);
CREATE INDEX IF NOT EXISTS employees_type_idx       ON employees (employment_type);
CREATE INDEX IF NOT EXISTS employees_status_idx     ON employees (status);
CREATE INDEX IF NOT EXISTS employees_manager_idx    ON employees (manager);
-- Composite index matching the keyset pagination tuple (sort column, pk).
CREATE INDEX IF NOT EXISTS employees_keyset_idx     ON employees (start_date DESC, id DESC);
