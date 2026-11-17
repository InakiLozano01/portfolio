-- Artifacts tables. Plain SQL in its own schema; run by scripts/artifacts-schema.cjs with the owner role.
CREATE SCHEMA IF NOT EXISTS artifacts;

CREATE TABLE IF NOT EXISTS artifacts.settings (key text PRIMARY KEY, value text NOT NULL);

CREATE TABLE IF NOT EXISTS artifacts.api_tokens (
  id bigserial PRIMARY KEY, name text NOT NULL, token_hash text NOT NULL UNIQUE,
  -- A limited token only reaches the restricted artifacts it created, and cannot share, open or delete them.
  limited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz, revoked_at timestamptz);

CREATE TABLE IF NOT EXISTS artifacts.artifacts (
  id bigserial PRIMARY KEY, slug text NOT NULL UNIQUE, title text NOT NULL,
  current_version integer NOT NULL DEFAULT 0, cap_epoch integer NOT NULL DEFAULT 0,
  access text NOT NULL DEFAULT 'restricted' CHECK (access IN ('restricted', 'link', 'password')),
  access_role text NOT NULL DEFAULT 'viewer' CHECK (access_role IN ('viewer', 'responder', 'editor')),
  password_hash text, password_epoch integer NOT NULL DEFAULT 0,
  responders text NOT NULL DEFAULT 'account' CHECK (responders IN ('anonymous', 'declared', 'account')),
  responses_open boolean NOT NULL DEFAULT true,
  feedback text NOT NULL DEFAULT 'score' CHECK (feedback IN ('none', 'score', 'answers')),
  notify_owner boolean NOT NULL DEFAULT false,
  created_by_token bigint REFERENCES artifacts.api_tokens(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS artifacts.versions (
  id bigserial PRIMARY KEY, artifact_id bigint NOT NULL REFERENCES artifacts.artifacts(id) ON DELETE CASCADE,
  version integer NOT NULL, note text, created_by text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, version));

-- One stored object. Video blobs are replaced by their HLS renditions once encoded (stored_bytes follows).
CREATE TABLE IF NOT EXISTS artifacts.blobs (
  key text PRIMARY KEY, sha256 text, size bigint NOT NULL, stored_bytes bigint NOT NULL,
  content_type text NOT NULL, video_status text CHECK (video_status IN ('pending', 'ready', 'failed')),
  renditions jsonb, error text, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS blobs_sha ON artifacts.blobs (sha256, size);

CREATE TABLE IF NOT EXISTS artifacts.files (
  version_id bigint NOT NULL REFERENCES artifacts.versions(id) ON DELETE CASCADE, path text NOT NULL,
  blob_key text NOT NULL REFERENCES artifacts.blobs(key), PRIMARY KEY (version_id, path));
CREATE INDEX IF NOT EXISTS files_blob ON artifacts.files (blob_key);

CREATE TABLE IF NOT EXISTS artifacts.state_revisions (
  artifact_id bigint NOT NULL REFERENCES artifacts.artifacts(id) ON DELETE CASCADE, rev integer NOT NULL,
  doc jsonb, saved_by text NOT NULL, saved_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (artifact_id, rev));

CREATE TABLE IF NOT EXISTS artifacts.accounts (
  id bigserial PRIMARY KEY, email text NOT NULL UNIQUE, alias text, password_hash text,
  created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS artifacts.shares (
  artifact_id bigint NOT NULL REFERENCES artifacts.artifacts(id) ON DELETE CASCADE,
  account_id bigint NOT NULL REFERENCES artifacts.accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('viewer', 'responder', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (artifact_id, account_id));
CREATE INDEX IF NOT EXISTS shares_account ON artifacts.shares (account_id);

-- Account sessions have account_id; shared-password sessions have artifact_id and the password epoch they were issued under.
CREATE TABLE IF NOT EXISTS artifacts.sessions (
  token_hash text PRIMARY KEY, account_id bigint REFERENCES artifacts.accounts(id) ON DELETE CASCADE,
  artifact_id bigint REFERENCES artifacts.artifacts(id) ON DELETE CASCADE, password_epoch integer,
  csrf text NOT NULL, expires_at timestamptz NOT NULL,
  CHECK ((account_id IS NULL) <> (artifact_id IS NULL)));

-- Invitation and password-reset links. Single use.
CREATE TABLE IF NOT EXISTS artifacts.tokens (
  token_hash text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('invite', 'reset')),
  account_id bigint NOT NULL REFERENCES artifacts.accounts(id) ON DELETE CASCADE,
  artifact_id bigint REFERENCES artifacts.artifacts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, used_at timestamptz);

CREATE TABLE IF NOT EXISTS artifacts.responses (
  id bigserial PRIMARY KEY, artifact_id bigint NOT NULL REFERENCES artifacts.artifacts(id) ON DELETE CASCADE,
  responder_key text NOT NULL, account_id bigint REFERENCES artifacts.accounts(id) ON DELETE SET NULL,
  declared_name text, declared_email text, answers jsonb NOT NULL, score numeric, max_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, responder_key));

CREATE TABLE IF NOT EXISTS artifacts.answer_keys (
  artifact_id bigint PRIMARY KEY REFERENCES artifacts.artifacts(id) ON DELETE CASCADE,
  key jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS artifacts.uploads (
  id text PRIMARY KEY, artifact_id bigint NOT NULL REFERENCES artifacts.artifacts(id) ON DELETE CASCADE,
  path text NOT NULL, size bigint NOT NULL, content_type text NOT NULL, fingerprint text,
  -- The declared whole-file digest, checked on complete.
  sha256 text,
  object_key text NOT NULL, s3_upload_id text NOT NULL, part_size integer NOT NULL,
  parts jsonb NOT NULL DEFAULT '{}'::jsonb, completed_at timestamptz,
  -- Set once the file is placed in a version; the row stays until expiry so a repeated complete is answered, not 404.
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL);
