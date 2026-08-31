CREATE TABLE IF NOT EXISTS feature_flags (
  id          bigserial PRIMARY KEY,
  flag_key    text        NOT NULL,
  description text        NOT NULL,
  environment text        NOT NULL DEFAULT 'dev',
  enabled     text        NOT NULL DEFAULT 'off',
  owner_team  text        NOT NULL,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_flags_env_idx     ON feature_flags (environment);
CREATE INDEX IF NOT EXISTS feature_flags_enabled_idx ON feature_flags (enabled);
CREATE INDEX IF NOT EXISTS feature_flags_owner_idx   ON feature_flags (owner_team);
CREATE INDEX IF NOT EXISTS feature_flags_keyset_idx  ON feature_flags (updated_at DESC, id DESC);
