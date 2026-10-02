# PostgreSQL persistence and recovery

The portfolio uses PostgreSQL through `pg`. Mongoose remains a validation and
document API library; no runtime MongoDB connection is opened. The existing models
bind their collection operations to `lib/postgres-store.js` before use. Unsupported
operations fail explicitly. SQL values and field paths are parameterized.

## Data contract

Each of the eight application collections has a table in the `portfolio` schema:
`admins`, `blogs`, `comments`, `contacts`, `projects`, `sections`, `skills`, and
`subscribers`. Each row retains the original ID, authoritative BSON bytes, an
indexed JSONB search projection, and a revision counter. Keeping BSON preserves
ObjectIds, dates, binary values, 64-bit integers, decimals and unknown legacy
fields. Existing reference IDs and array order are retained. Relations are
resolved through the existing model population code; recovery reports dangling
references instead of inventing records or silently deleting them.

The importer preserves raw BSON without save hooks, including existing bcrypt
admin hashes and subscriber tokens. It re-creates supported source unique indexes,
retains the original index/options manifest, and refuses unsupported unique-index
semantics. Unexpected collections are preserved in `legacy_documents` rather than
dropped. Do not put exports, reports containing private data, or credentials in
the repository or `public/`.

Updates use PostgreSQL transactions and row locks. Document saves use the model's
optimistic concurrency check. The small connection pool is limited to four
connections; statements and connection establishment have timeouts.

## Import

Supply a private `DATABASE_URL` for the migration owner, then run:

```sh
npm run db:migrate
npm run db:import -- /private/path/logical-export
```

The manifest must list every application collection. The importer verifies every
file hash and BSON length/count before starting. A first import requires empty
tables and commits all documents plus a private migration ledger atomically.
It compares every stored BSON byte with the export. A retry verifies the same
snapshot and performs no writes; it refuses changed destinations and other source
snapshots. Run it before admitting application traffic, not against an evolving
production database.

The app role needs schema usage and SELECT/INSERT/UPDATE/DELETE on the eight app
tables. It does not need superuser, role creation, database creation, schema DDL,
or access to the migration ledger/legacy archive. `compose.postgres.yml` describes
an isolated PostgreSQL 16 destination with no host port. Provision roles and secrets
only with explicit authorization. Preserve the old Mongo volume and cold backup.

Contact expiry was formerly a Mongo TTL index. The source expiry metadata is
preserved; PostgreSQL does not implement Mongo TTL indexes. Run the explicit
contact-retention maintenance command on the same 30-day policy after recovery
validation. Never apply retention to recovery archives.

## Verification and cutover

Run `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`,
`npm run test:postgres`, and the production build with one build worker.
The PostgreSQL integration suite uses an isolated PostgreSQL engine (PGlite),
covering model validation, login/hash behavior, population, projections, filters,
sorting, updates, unique indexes, BSON types and stale writes. Verify the real
snapshot separately with `scripts/check-export-postgres.cjs` and then again on
the destination server. Check app-role permissions, public routes, private-route
401 responses, and the authenticated admin without reading the user's password.

Build and smoke-test the candidate separately. Before routing production traffic,
retain the previous container/image, assets and environment, make a PostgreSQL
backup, and record the candidate image. The Mongo service was already unavailable;
returning to the previous Mongo-backed application restores that prior unavailable
state, not a healthy database. Keep the verified PostgreSQL snapshot for forward
recovery. Do not deploy invoices as part of this database migration.

Use `compose.postgres-app.yml` for the migrated application, with a separate Compose
project. It reuses the existing private application environment through Docker's
normal env-file handling, then loads the new limited PostgreSQL app role. Supply
the image digest, existing images path, and both private environment file paths in
a non-secret deployment configuration. Do not print expanded Compose configuration.
The old `docker-compose.yml` is the preserved Mongo deployment and must not be used
to rebuild the migrated application. PostgreSQL and Redis remain independent of
application replacement; never use `down -v` during cutover or rollback.

Smoke-test with `PORTFOLIO_APP_PORT=33003`, then stop the old app only and deploy the
same image on port 3003. Keep the old container stopped for rollback. Enable
`PORTFOLIO_CONTACT_RETENTION_ENABLED=true` after recovery checks to retain the
existing 30-day contact expiry policy. This affects live contacts only.
