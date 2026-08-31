CREATE TABLE IF NOT EXISTS kyc_cases (
  id              bigserial PRIMARY KEY,
  customer_name   text        NOT NULL,
  customer_email  text        NOT NULL,
  document_number text        NOT NULL,
  country         text        NOT NULL,
  risk_score      integer     NOT NULL,
  risk_band       text        NOT NULL DEFAULT 'low',
  flag_reason     text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending',
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_by     text,
  reviewed_at     timestamptz,
  review_note     text
);

CREATE INDEX IF NOT EXISTS kyc_cases_status_idx  ON kyc_cases (status);
CREATE INDEX IF NOT EXISTS kyc_cases_band_idx    ON kyc_cases (risk_band);
CREATE INDEX IF NOT EXISTS kyc_cases_country_idx ON kyc_cases (country);
CREATE INDEX IF NOT EXISTS kyc_cases_score_idx   ON kyc_cases (risk_score);
CREATE INDEX IF NOT EXISTS kyc_cases_keyset_idx  ON kyc_cases (risk_score DESC, id DESC);
