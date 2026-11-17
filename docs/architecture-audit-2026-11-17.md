# Portfolio architecture and cleanup audit

Date: 2026-11-17
Branch: `feat/artifacts-integration`
Tip: `5b47f2e`

This is the result of the full-send review requested against the portfolio and
artifacts code. High-confidence fixes were integrated. Changes that require a
new persistence boundary, a migration, or a product decision remain in the
review queue rather than being hidden behind compensating code.

## Integrated

- Resumable upload lookup is scoped to the bearer-token upload scope. A token
  cannot resume another token's upload or bypass its open-upload limit.
- Browser acceptance now asserts content URL shape, response export contents,
  share revocation, and token revocation.
- Production cutover checks validate private app/encoder env files, Compose
  wiring, migration order, nginx body limits/timeouts, MCP routing, and
  read-only content-origin behavior.
- A repeatable release checklist documents migration, rollback preservation,
  secret handling, nginx validation, token rotation, and cutover verification.
- The unreferenced duplicate `components/ui/use-mobile.tsx` was removed; the
  canonical hook remains `hooks/use-mobile.tsx`.
- The admin `/api/messages` collection now caps results at 100, matching the
  existing contact-list contract and preventing an unbounded response.
- Admin seeding now requires an explicit `ADMIN_PASSWORD`; the insecure
  `admin123` fallback is gone.
- Cache refresh now revalidates the localized `/en` and `/es` project/blog
  routes instead of obsolete unlocalized paths.
- CLI/MCP contract fixes include CSV response export, answer-key deletion,
  required general-access kind, stable delete URLs, and scoped URL docs.
- Existing artifact databases now receive additive forward migrations for
  token limits, token ownership, upload integrity, upload consumption, and
  upload scope; the migration guard tests these requirements.
- The admin console and owner share dialog now support framed, keyboard-safe
  sharing, account management, token lifecycle, invitations, resets, and
  deletion confirmation with browser coverage.
- Automatic artifact slugs now use the unique index as the concurrency
  authority, retry bounded suffixes, and return a stable exhaustion error.
- The schema migration can optionally grant the least-privilege app role via
  `ARTIFACTS_APP_ROLE`; nginx now has a standalone no-write/real-IP check.

## Validation

Passing checks:

- `npm run -s typecheck`
- `npm run -s lint` (10 pre-existing warnings, 0 errors)
- `npm run -s test:artifacts:deployment` — 9/9
- `ARTIFACTS_TEST_PORT=56990 npm run -s test:artifacts` — 15/15
- `ARTIFACTS_TEST_PORT=56190 npm run -s test:artifacts:uploads` — 10/10
- `ARTIFACTS_TEST_PORT=56290 npm run -s test:artifacts:browser` — 1/1
- `ARTIFACTS_TEST_PORT=56890 npm run -s test:artifacts:console` — 3/3
- `npm run -s check:artifacts:nginx` — PASS
- `ARTIFACTS_MIGRATION_TEST_DATABASE_URL=<disposable PostgreSQL> npm run -s test:artifacts:migration` — 1/1
- `npm test -- --runInBand` — 24 suites, 77 tests
- `npm run -s test:security` — 7 security tests plus dependency checks
- `NEXT_DIST_DIR=.next-audit npx next build`

The first HTTP run failed because another worker was using the default test
ports and removed the shared throwaway PostgreSQL container. Re-running each
artifact seam on an isolated port passed; this is test-harness interference,
not an application regression.

## Review queue

### P0 — durable external-object lifecycle

`lib/artifacts/store.ts:64-73`, `lib/artifacts/store.ts:101-109`,
`lib/artifacts/store.ts:313-332`, and `lib/artifacts/api.ts:154-223` write S3,
PostgreSQL, Redis, and version pointers as separate operations. A process
failure can leave an object without metadata, metadata without a queued video,
or a database row deleted while S3 deletion failed.

**Before:** request-time writes plus best-effort garbage collection.
**After:** create an explicit object lifecycle (`staged`, `attached`,
`deleting`, `deleted`, `failed`) and a transactional outbox/job table. Workers
perform idempotent S3 operations and retain the record until deletion is
acknowledged. Add fault-injection tests before migrating.

### P0 — durable video jobs

`scripts/artifacts-encoder.mjs:78-120` uses Redis lists as job state and moves
all processing items back to the queue on startup. It deletes the source after
both success and failure.

**Before:** queue repair and destructive error cleanup.
**After:** a PostgreSQL job row with lease, attempt count, retryable/terminal
states, and an auditable error. Publish HLS renditions only after all objects
exist; delete the source only after a committed ready transition and a later
retention pass. This is intentionally not a local one-line change.

### P1 — filesystem asset publication

`app/api/upload/blog-image/route.ts:90-108`,
`app/api/upload/route.ts:265-346`, and the blog PDF routes write multiple
filesystem targets and database pointers independently.

**Before:** writable mirrors and sequential files can disagree after a partial
failure.
**After:** one canonical immutable asset store, or same-directory temporary
file plus atomic rename; publish the database pointer only after all requested
language/variant outputs are complete. Add fault-injection coverage first.

### P1 — cache ownership and error semantics

`lib/cache.ts:14-71` has multiple key shapes, Redis `KEYS` scans, and converts
database failures into empty arrays. Several routes manually duplicate
invalidation.

**Before:** ad-hoc invalidation plus silent empty fallback.
**After:** one typed key factory, cache-aside reads with TTL, explicit write
invalidation/versioning, and database errors that remain errors rather than
appearing as empty content.

### P1 — one admin-principal resolver

`lib/admin-auth.ts`, `lib/auth.ts`, `proxy.ts`, the admin layout, and
`lib/artifacts/access.ts` repeat parts of session lookup and revocation.

**Before:** perimeter, page, API, and artifact-owner checks can drift.
**After:** one server-only `resolveAdminPrincipal()` with `requireAdmin`, page
guards, and artifact owner access layered on top; proxy remains an early
routing optimization only.

### P2 — BSON/JSONB compatibility mirror

`lib/postgres-store.js:164-188` persists BSON as authoritative data and JSONB
as a searchable projection.

**Before:** two complete serialized representations can diverge.
**After:** choose one canonical runtime representation and derive projections
through generated columns or a transactional projection worker. Until then,
add a checksum/version invariant and a health check.

### P2 — rate-limit reservation API

`lib/artifacts/access.ts:74-93`, `lib/rate-limit.ts:12-35`, and `lib/auth.ts`
reserve attempts before work and refund/reset them afterward.

This is deliberate security behavior and current tests cover the burst
guarantee. Do not replace it with post-check counting. If deployment becomes
multi-process, redesign it as an atomic reservation/commit primitive (likely a
Redis script) and keep the policy behind one limiter service.

### P2 — collection scans and large payloads

The complexity audit found several production paths where work grows with the
entire collection or payload rather than the requested result:

- `lib/blog.ts:23-47` and `lib/projects.ts:41-68` fallback slug lookup loads
  full documents and scans them in JavaScript; normalize/index slugs and keep
  the legacy repair path projection-only.
- `app/api/messages/route.ts` was unbounded; it is now capped at 100. Add
  cursor pagination if the inbox needs more history.
- `lib/artifacts/responses.ts:150-175` materializes every response and the
  complete CSV; use a cursor/streaming export and add an
  `(artifact_id, created_at)` index for large artifacts.
- `lib/cache.ts:58-72` uses Redis `KEYS`, an O(K) blocking scan. Replace it
  with versioned keys, a namespace set, or incremental `SCAN`.
- Archive newsletter delivery is a serial nested fan-out and needs an
  idempotent outbox/job boundary before volume grows.
- Comment subtree deletion and embedded vote arrays grow with tree depth and
  voter count; move votes to a keyed relation and delete subtrees with a
  recursive/batched query after behavior is pinned.

Heuristic analyzer warnings in fixed-size UI loops and tests were not promoted
to fixes.

## Contract and repository hygiene queue

- `lib/artifacts/schema.sql` now has idempotent forward migrations for every
  post-initial column. A disposable live-database migration test would still
  be useful before the next schema change.
- `env.local` and `env.production` are tracked secret-bearing environment
  filenames despite the documented boundary. Treat values as compromised,
  rotate credentials, then remove/ignore them in a deliberate deployment
  change; they were not deleted automatically.
- `.eslintrc.json` coexists with the canonical flat `eslint.config.mjs`; remove
  only after confirming external tooling no longer consumes the legacy config.
- The Mongo-shaped PostgreSQL compatibility adapter is a deliberate migration
  bridge. Hide it behind feature repositories before attempting a SQL rewrite.
- Historical maintenance docs mention Node 22 while the Dockerfile pins Node
  26; label the old note historical or update the operational runbook.

## Explicit state machines

The current code already encodes several state machines through nullable
columns and epochs. The concrete improvements are:

1. **Uploads:** make `open -> completed -> consumed` and
   `open -> expired|aborted` explicit, with all transitions named and guarded
   by one transaction. Current `completed_at`, `consumed_at`, and expiry logic
   is correct enough for the tested path but remains easy to extend wrongly.
2. **Video:** replace the implicit combination of `video_status`, Redis queue
   membership, and object prefixes with `pending -> processing -> ready` or
   `pending -> retryable|failed`. Leases and attempts belong in PostgreSQL.
3. **Artifact versions:** retain immutable versions and model rollback as a
   new version. This is already an explicit product command and was left
   unchanged.
4. **Access revocation:** treat `cap_epoch` and `password_epoch` as explicit
   capability generations. The behavior is tested; the remaining improvement
   is to centralize capability issuance/validation instead of spreading epoch
   checks across routes.

## Intentional complexity left alone

- The artifact API is split by domain (`access`, `responses`, `store`, `mcp`)
  rather than collapsed into one file. The next safe architectural step is to
  deepen the public command boundary, not to add more wrappers.
- The CLI retry loop is bounded and resumable by design; it is not an
  unbounded repair loop.
- The BSON compatibility adapter remains until the migration plan chooses a
  canonical representation.
- Rate-limit refunds remain until a distributed atomic primitive exists.

## Remaining lint/build warnings

Lint has no errors but reports ten existing warnings: one temporary file under
`.remember/`, five hook dependency warnings in section components, one hook
memo dependency warning, and three missing PDF image alt-text warnings.
The build passes but emits expected local-environment Redis DNS messages while
collecting pages and Next.js expands generated `tsconfig` includes; generated
files were restored after the build.

The active `dp-minio` container was not stopped or deleted. Its Compose file was
moved out of the disposable worktree to `/home/ubuntu/vps/artifacts-runtime/`
so the Git checkout can converge to one worktree without orphaning its runtime
configuration or persistent volume.
