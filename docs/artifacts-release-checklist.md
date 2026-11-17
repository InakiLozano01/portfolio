# Artifacts production release and cutover

This is the repeatable runbook for replacing the old artifacts service with the
portfolio application. It assumes the reviewed image is immutable and that the
operator has private PostgreSQL, Redis, MinIO/S3, SMTP and deployment-config
files. Never put their contents, API tokens, passwords or expanded Compose
configuration in the repository or in a terminal transcript.

## 1. Preflight

- [ ] Record the candidate image digest, the current application image, the current artifact version and the operator/time in the release log.
- [ ] Preserve the old container, Mongo volume and last backup for rollback. Do not run `docker compose down -v`.
- [ ] Copy `env.artifacts-app.example` and `env.artifacts-encoder.example` to a private directory, fill them with the existing production values, and set mode `600`.
- [ ] Confirm the app file contains the PostgreSQL URL, Redis URL, session secret, SMTP settings, both artifact origins, and all four S3 settings.
- [ ] Confirm the encoder file contains only its six required values, plus optional `ARTIFACTS_ENCODER_TMP`; it must not contain `NEXTAUTH_SECRET`, SMTP values or other app secrets.
- [ ] Validate both files without printing their values:

  ```sh
  node scripts/artifacts-deployment-check.mjs --role app --env-file /private/artifacts/app.env --no-static
  node scripts/artifacts-deployment-check.mjs --role encoder --env-file /private/artifacts/encoder.env --no-static
  npm run check:artifacts:deployment
  ```

- [ ] Run `docker compose -f compose.postgres-app.yml config --quiet` with the private deployment configuration. Keep output quiet; it is only a configuration parse check.
- [ ] Apply `docs/artifacts-nginx.patch` to a copy of the live Nginx configuration and run `nginx -t` on that copy before touching the live proxy. Both origins must reach port `3003`; upload parts must stream with a `20m` body limit and `300s` timeout; content remains GET/HEAD-only.

## 2. Migration and readiness

Run these steps in order while the old app is still stopped from admitting writes:

```sh
npm run db:migrate
npm run db:migrate:artifacts
node scripts/artifacts-deployment-check.mjs --role app --env-file /private/artifacts/app.env --no-static --check-db
```

- [ ] `npm run db:migrate` completes first, so the portfolio `admins` table and the PostgreSQL app schema exist.
- [ ] `npm run db:migrate:artifacts` completes second; it is idempotent and reads only `lib/artifacts/schema.sql`.
- [ ] The database check reports the base `portfolio` table and artifact `settings`, `artifacts`, `blobs`, `files` and `sessions` tables. If it fails, stop; do not admit traffic.
- [ ] Take a fresh PostgreSQL backup after both migrations and before cutover. Keep the old Mongo backup unchanged.
- [ ] Verify the app role has DML access to the required tables and does not have schema-DDL or migration-ledger privileges.

## 3. Smoke deploy

- [ ] Start the candidate as a separate Compose project on a smoke port, for example `PORTFOLIO_APP_PORT=33003`, with the same immutable image and private env files.
- [ ] Confirm the app and encoder containers are healthy and that Redis is reachable from both. Confirm the encoder has no host port and only its dedicated `/tmp` volume.
- [ ] Through the smoke proxy, verify both origins, `X-Robots-Tag`, the content CSP sandbox, and the artifact shell. Do not accept a result that adds `allow-same-origin` or exposes a capability path as a referrer.
- [ ] Publish one existing artifact, upload one small image and one video, confirm the video enters the Redis queue, and verify HLS renditions plus the original-object deletion after encoding.
- [ ] Verify an upload part larger than the configured `16 MiB` part is rejected, and that the normal part succeeds through the proxy without buffering.
- [ ] Record dry-run evidence: checker output, migration output, image digest, smoke URLs/statuses, encoder result and backup identifier. Do not record secrets or bearer tokens.

## 4. Token and secret rotation

- [ ] Rotate `NEXTAUTH_SECRET` only during a planned session invalidation window; changing it invalidates portfolio admin sessions. Re-authenticate the owner before validating artifacts.
- [ ] Rotate S3/MinIO access keys by creating the replacement key, updating both private env files, smoke-testing reads/writes, then revoking the old key. Never place keys in Compose YAML or shell history.
- [ ] Rotate SMTP credentials through the mail provider, update only the private app env file, and send a captured invitation/reset smoke message before cutover.
- [ ] Create a new Artifacts API token in **Artifacts → API tokens** for each automation that needs access, store it in the keys hub/token file with mode `600`, and revoke the old token only after the new token is verified.
- [ ] Reissue tokens after any suspected exposure. Tokens are returned once; do not copy them into the release log or issue comments.
- [ ] Changing an artifact's access or shared password bumps its capability/password epoch; republish or reload the artifact after access changes and verify old content links fail.

## 5. Cutover and rollback

- [ ] Stop only the old application container. Leave PostgreSQL, Redis, MinIO and their volumes running; never use `down -v`.
- [ ] Start the same candidate image on port `3003` with `compose.postgres-app.yml`, then apply the reviewed Nginx patch, run `nginx -t`, and reload Nginx.
- [ ] Re-run the origin, login, publish, upload and encoder smoke checks through the production hostnames. Confirm the content origin is still sandboxed and noindex.
- [ ] Keep the old container stopped, not deleted, for the rollback window. Roll back by routing Nginx to the retained candidate/old app only after preserving the PostgreSQL backup and recording the reason.
- [ ] After the observation window, revoke superseded tokens/keys, remove only the stopped old container when authorized, and attach the dry-run evidence to the release record.

## Known embed limitation

YouTube, Vimeo and Drive embeds remain supported as artifact HTML, but the
opaque sandbox intentionally omits `allow-same-origin`. Chromium therefore sends
no referrer from the embedded artifact, and providers that require a referrer
(notably some YouTube playback paths) may refuse to play. Do **not** weaken the
sandbox or add `allow-same-origin` to make those embeds work; use uploaded HLS
video when access-controlled playback is required.
