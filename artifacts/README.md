# Artifacts server

Shareable, never-indexed HTML artifacts at `https://artifacts.inakilozano.com/<slug>`. Every artifact can have guest editors whose edits persist on the server.

- **App origin** `artifacts.inakilozano.com`: agent API, guest login, and the viewer "shell" page.
- **Content origin** `artifacts-content.inakilozano.com`: serves the artifact's own files inside a sandboxed iframe.

The server is a single Node process with no npm dependencies (`node:sqlite`, `crypto.argon2`), started with `artifacts/compose.yml` behind the host nginx.

## Publishing (agents)

Auth: the Bearer token is held by the keys hub as service **`artifacts-inaki`**. Do not print it. From a host authorized to SSH to myvps, use the broker for paths under `/api/v1/`:

```sh
printf '%s' '{"title":"Example","html":"<!doctype html>..."}' | python3 /home/ubuntu/vps/agent-hub/packages/keys-hub/cli.py artifacts-inaki POST /api/v1/artifacts
python3 /home/ubuntu/vps/agent-hub/packages/keys-hub/cli.py artifacts-inaki GET /api/v1/artifacts
```

The broker returns JSON containing `status`, `etag`, and `body`. Its CLI accepts request bodies up to 1 MiB and does not expose a custom Content-Type; use JSON `files` for uploads through this client. The server limits below may be higher. The older `agent-keys-hub` installation may receive Cloudflare 403.

The agent MCP supports `hub_key_operation service=artifacts-inaki operation=create-artifact|list-artifacts`, currently returning status only. Arbitrary artifact-specific paths are not exposed by that MCP; use the broker with authorized myvps access. Choose a slug when creating through MCP and verify the public URL.

| Method | Path (`/api/v1/...`) | Body / notes |
|---|---|---|
| GET | `artifacts` | List artifacts. |
| POST | `artifacts` | `{title, html, slug?, visibility?: "public"\|"private", note?, files?: [{path, content \| base64, contentType?}]}`. The slug comes from the title (`crm-etapas-andres`, then `-2` if taken) unless you pass one. |
| GET | `artifacts/:ref` | `:ref` is the id or the slug. Returns the versions, the current files, the credential usernames and the current `stateRev`. |
| PATCH | `artifacts/:ref` | `{title?, slug?, visibility?}`. Renaming the slug breaks old links: there is no redirect. |
| DELETE | `artifacts/:ref` | Deletes everything: versions, files, state, credentials. |
| POST | `artifacts/:ref/versions` | `{html?, files?, removeFiles?: [path], note?}`. Starts from the previous version's files. The slug serves the latest version. |
| POST | `artifacts/:ref/rollback` | `{version}` creates a new version that copies an old one. |
| GET | `artifacts/:ref/files/<path>?version=N` | Download a file, e.g. the current `index.html` before you edit it. |
| PUT | `artifacts/:ref/files/<path>` | Raw body (≤ 15 MB) with a `Content-Type` header. Creates a new version. |
| DELETE | `artifacts/:ref/files/<path>` | Creates a new version without that file. |
| POST | `artifacts/:ref/credentials` | `{username, password?, replace?}`. Leave out `password` and one is generated and **returned once**. `replace: true` resets the password and logs out that user's sessions. |
| DELETE | `artifacts/:ref/credentials/:username` | Revokes the credential, its sessions, and every content link already issued. |
| GET / PUT | `artifacts/:ref/state` | Read or seed the editable state. PUT takes `{state, baseRev?}`. GET accepts `?rev=N`. |
| GET | `artifacts/:ref/state/history?limit=` | `[{rev, savedBy, savedAt, bytes}]`. The newest 500 revisions are kept. |
| GET / POST / DELETE | `tokens`, `tokens/:id` | List, create (`{name}`, the token is returned once) or revoke API tokens. Private-only tokens get 403. |
| POST | `uploads` | `{artifact: <id>, path, size, sha256, contentType}`. Opens a resumable upload. Returns `{id, artifact, size, partSize, parts, expiresAt}`. |
| PUT | `uploads/:id/parts/:n` | Raw bytes of part `n` (`0..parts-1`) with header `X-Content-Sha256: <hex>`. Each part is exactly `partSize` bytes, except the last. |
| GET | `uploads/:id` | `{..., receivedCount, missing: [n] (first 100), state: "open"\|"completed", version?}`. |
| POST | `uploads/:id/complete` | `{note?}`. Verifies the whole file and creates a new version with it. Safe to repeat. |
| DELETE | `uploads/:id` | Aborts the upload and deletes its parts. |

Limits: request bodies up to 40 MB, 15 MB per file, 100 MB added per request, 300 files per version, 2 MB per state document. A whole version may reach `ARTIFACTS_MAX_UPLOAD_VERSION_BYTES` (2 GiB), so an artifact that holds a large upload still accepts small edits and rollbacks.

### Uploads

Upload sessions carry files larger than the 15 MB `PUT` limit, in 8 MiB parts that can be sent in any order and resent after a failure. Only one part is held in memory at a time.

- Re-sending a part with the same digest returns 200. A different digest for a stored part returns 409 `conflict`. A part whose bytes do not match `X-Content-Sha256` returns 400 `integrity`.
- `complete` returns 409 `incomplete` with `missing` until every part is stored. If the assembled file does not match `sha256`, it returns 422 `integrity`, drops all parts and keeps the session open: send every part again. PDF, PNG, JPEG and ZIP files must start with their magic bytes, or `complete` returns 422 `content_type_mismatch`.
- `text/html` uploads are limited to 15 MB (413 `html_too_large`), because HTML is read into memory when served.
- `POST uploads` returns 507 `insufficient_storage` when the data disk has less than twice the declared size plus 1 GiB free (`ARTIFACTS_MIN_FREE_BYTES` sets the margin).
- `contentType` must be one of `application/pdf`, `text/html` (stored as `text/html; charset=utf-8`), `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `application/json`, `text/csv`, `text/plain`, `application/zip`, `application/octet-stream`.
- Limits: 1 GiB per file (`ARTIFACTS_MAX_UPLOAD_BYTES`), 2 GiB per version created by an upload (`ARTIFACTS_MAX_UPLOAD_VERSION_BYTES`), 8 open sessions, 4 GiB declared across open sessions (429 `upload_limit`). Sessions expire after 24 h. Expired sessions and their parts are deleted at startup and every hour. `ARTIFACTS_UPLOAD_PART_BYTES` changes the part size only when `NODE_ENV=test` or `ARTIFACTS_TEST_MODE=1`; otherwise parts are 8 MiB. Numeric limit variables must be positive integers, or the server exits at startup.
- `complete` returns 409 `conflict` when the parts disappeared underneath it, for example after a concurrent abort.
- Session ids are integers and are never reused. Parts live in `uploads/<id>/` under the data directory until `complete` succeeds.

### Private-only tokens

A token created with `--private-only` creates artifacts as `private` by default and gets 403 `forbidden` when it asks for `public` on `POST artifacts` or `PATCH`. Every artifact records the token that created it. A private-only token gets 403 on any artifact it did not create or that is no longer private, on every `artifacts/:ref` route and on `POST uploads`. `GET artifacts` lists only its own private artifacts. It cannot delete artifacts, manage credentials or manage tokens, and it sees only its own upload sessions (others return 404). `complete` checks again that the artifact is still private and still its own. Artifacts created before ownership was recorded have no owner, so only unrestricted tokens can touch them. Other tokens keep the `public` default and unrestricted access.

Asset paths must be **relative** (`img/logo.png`, never `/img/logo.png`). The artifact is served under a per-version capability path.

## Visibility and editing

- `public`: anyone with the link can view. Only credential holders can edit.
- `private`: anyone without a session sees a login form and nothing else, not even the title. Content links already issued stop working as soon as the artifact turns private.
- Credentials are scoped to one artifact. Logging in sets an `HttpOnly; Secure; SameSite=Strict` `__Host-` cookie that lasts 30 days. Writes also require a per-session CSRF token and the app `Origin`. After 10 failed logins per IP, or per artifact+username, in 15 minutes, logins return 429; nginx `auth_limit` also applies.

## Client contract (inside the artifact)

Every HTML file served gets a script injected that defines `window.artifact`. The artifact never sees cookies or tokens. Calls go through `postMessage` to the shell, and the shell talks to the API.

```js
const info = await artifact.ready;          // {id, slug, title, version, visibility, hasCredentials, user, canEdit}
const { state, rev, savedBy, savedAt } = await artifact.getState();   // state is null until the first save
const saved = await artifact.saveState(newState, { baseRev: rev });  // opens the login dialog if needed
// errors carry .code: 'unauthorized' | 'conflict' (err.currentRev) | 'too_large' | 'cancelled' | 'not_framed'
await artifact.history();                   // editors only: [{rev, savedBy, savedAt, bytes}]
await artifact.getState({ rev: 3 });        // editors only: an older revision
await artifact.login(); await artifact.logout();
artifact.onSession(info => { /* re-render on login/logout */ });
```

`examples/crm-stages.html` is a complete editable example (stages, tasks, triggers).

## Security model

Artifact HTML runs on a separate origin, inside `<iframe sandbox="allow-scripts allow-forms allow-popups ...">` without `allow-same-origin`. The content origin also sends `Content-Security-Policy: sandbox ...`, so the sandbox holds even when the file is opened directly. Artifact code therefore runs in an opaque origin. It cannot read app cookies, the session, the CSRF token, other artifacts or storage, and it cannot call the API: there is no CORS, and the guest API requires a custom header that forces a preflight the server never answers. The shell answers `postMessage` only from its own iframe, and only for its own artifact. Content URLs carry an HMAC capability bound to artifact, version and epoch, valid 12 h. Passwords are stored with argon2id. API tokens are 256-bit random values stored as SHA-256 hashes.

Pages are never indexed: `robots.txt` disallows everything, every response carries `X-Robots-Tag: noindex, nofollow, noarchive` (from both the app and nginx), every served page gets a robots `<meta>` tag, and there is no sitemap.

## Operations

```sh
docker compose -f artifacts/compose.yml up -d --build                           # deploy (port 127.0.0.1:3480)
docker compose -f artifacts/compose.yml exec -T artifacts node server.mjs token create <name> [--private-only]   # prints once; pipe it into a secret store
docker compose -f artifacts/compose.yml exec artifacts node server.mjs token list | token revoke <id>   # list shows private_only
artifacts/backup.sh                                                             # snapshot + blobs -> ~/backups/artifacts (cron 02:50, keeps 14)
node --test artifacts/selftest.mjs                                              # end-to-end test against a throwaway server
```

The data lives in `/home/ubuntu/vps/artifacts-data` (bind mount): `artifacts.db`, content-addressed `blobs/`, and in-flight upload parts in `uploads/`, which backups skip. To restore, stop the container, extract a backup tarball into that directory, and start it again. Each nightly backup is a full tarball of the database and every blob, and 14 are kept, so backup disk use is about 14 times the data size and grows with every large upload.
