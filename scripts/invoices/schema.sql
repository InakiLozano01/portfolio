-- Explicit additive migration. Never run during app startup or DB recovery.
BEGIN;
CREATE SCHEMA IF NOT EXISTS portfolio;
CREATE TABLE IF NOT EXISTS portfolio.invoice_counters (
  year integer PRIMARY KEY CHECK (year BETWEEN 2000 AND 9999),
  value bigint NOT NULL CHECK (value > 0)
);
CREATE TABLE IF NOT EXISTS portfolio.invoices (
  id uuid PRIMARY KEY,
  number text NOT NULL UNIQUE,
  create_hash text NOT NULL,
  payload jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','unknown')),
  payment_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS portfolio.invoice_exports (
  invoice_id uuid NOT NULL REFERENCES portfolio.invoices(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  snapshot jsonb NOT NULL,
  pdf bytea NOT NULL CHECK (octet_length(pdf) BETWEEN 1 AND 10000000),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invoice_id, revision)
);
CREATE TABLE IF NOT EXISTS portfolio.invoice_payment_events (
  invoice_id uuid NOT NULL REFERENCES portfolio.invoices(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('unpaid','paid','unknown')),
  changed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invoice_id, version)
);
CREATE INDEX IF NOT EXISTS invoices_created_at ON portfolio.invoices(created_at DESC, id);
CREATE OR REPLACE FUNCTION portfolio.reject_invoice_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Invoice history is immutable' USING ERRCODE = '23000'; END $$;
DROP TRIGGER IF EXISTS invoice_exports_immutable ON portfolio.invoice_exports;
CREATE TRIGGER invoice_exports_immutable BEFORE UPDATE OR DELETE ON portfolio.invoice_exports
FOR EACH ROW EXECUTE FUNCTION portfolio.reject_invoice_history_mutation();
DROP TRIGGER IF EXISTS invoice_payments_immutable ON portfolio.invoice_payment_events;
CREATE TRIGGER invoice_payments_immutable BEFORE UPDATE OR DELETE ON portfolio.invoice_payment_events
FOR EACH ROW EXECUTE FUNCTION portfolio.reject_invoice_history_mutation();
COMMIT;
