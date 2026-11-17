# Artifacts

HTML pages the owner shares at `https://artifacts.inakilozano.com/<slug>`, never indexed. Vocabulary: `GLOSSARY.md`. Decisions: `docs/adr/0001-*`, `docs/adr/0002-*`. Behaviour: `docs/artifacts-spec.md`.

Artifacts are part of the portfolio Next.js app (`lib/artifacts/`). The same process serves two hostnames, told apart by `Host` in `proxy.ts`:

- **App origin** `artifacts.inakilozano.com`: the viewer shell, sign-in, invitation and reset pages, the guest API (`/api/a/<id>/…`, used only by the shell), the agent API (`/api/v1/…`) and the MCP endpoint (`/mcp`).
- **Content origin** `artifacts-content.inakilozano.com`: artifact files only, GET/HEAD, never cookies, always `Content-Security-Policy: sandbox …` without `allow-same-origin`.

Data: plain SQL tables in the portfolio PostgreSQL, schema `artifacts` (`lib/artifacts/schema.sql`, applied with `npm run db:migrate:artifacts`). Files: the `artifacts` bucket in the `minio` service. Video: the `artifacts-encoder` service (`scripts/artifacts-encoder.mjs`) takes jobs from Redis and stores HLS renditions; the original upload is deleted (ADR 0002). There is no backup job.

## Access

- **Owner**: whoever holds the portfolio admin login. Signing in on the artifacts origin mints a NextAuth session cookie for that host only, with the console's lifetime (30 min) and revocation on password change. The owner reaches every artifact and sees a **Compartir** button that opens the share dialog.
- **General access** per artifact: `restricted` (only the owner and shares), `link` (anyone with the link) or `password` (anyone who enters the shared password), each granting a role. A restricted artifact shows only a sign-in screen, without its title. New artifacts start restricted.
- **Shares**: an account (one per email, optional alias) gets a role on an artifact. Effective role = the highest of the share and the general access the visitor satisfies.
- **Roles**: viewer reads files and state; responder also submits its own response; editor also writes state and reads its history. Nobody but the owner and agents changes files, shares or settings.
- Tightening access (restricting, a new shared password, removing or lowering a share, deleting an account) bumps the artifact's epoch, so content links already issued stop working.
- Invitations, password resets, response notifications and response copies go out through the portfolio's SMTP mail. Sign-in, shared-password and link attempts are rate limited per address and per account or artifact.

## Client contract (inside the artifact)

Every HTML file gets a script that defines `window.artifact`. It talks to the shell with `postMessage`; artifact code never sees cookies or tokens and cannot call the API.

```js
const info = await artifact.ready  // {id, slug, title, version, role, user, owner, canEdit, canRespond, access, responses: {who, open, feedback}}
const { state, rev, savedBy, savedAt } = await artifact.getState()       // state is null until the first save
await artifact.saveState(next, { baseRev: rev })   // editors; opens the sign-in dialog if needed; err.code 'conflict' has err.currentRev
await artifact.history()                            // editors: [{rev, savedBy, savedAt, bytes}]
await artifact.getState({ rev: 3 })                 // editors: an older revision
const { response } = await artifact.getResponse()   // your own response or null
const r = await artifact.submitResponse({ q1: 'b', q2: ['a', 'c'] }, { name, email })  // name/email only when the artifact asks for a declared identity
// r.response.score / maxScore when the artifact shows scores; r.response.correct when it shows the answers
await artifact.videoStatus('media/talk.mp4')        // {status: 'pending' | 'ready' | 'failed'}
await artifact.login(); await artifact.logout(); artifact.onSession((info) => { /* re-render */ })
```

Uploaded video: `<video data-artifact-video="media/talk.mp4" controls></video>`. The client sets the poster and plays the HLS renditions (natively or with hls.js), or shows a note while it encodes. Embedded YouTube, Vimeo or Drive players work as usual. Asset paths must be relative (`img/logo.png`).

Answer key: `{"q1": {"answer": "b"}, "q2": {"answer": ["a", "c"], "points": 2}, "q3": {"answer": "Buenos Aires"}}`. Exact match per question: a list compares as a set, text ignores case, accents and extra spaces. It is never served to visitors; replacing it regrades every response.

Example: `artifacts/examples/crm-stages.html` (editable state).

## Agent API (`/api/v1`, `Authorization: Bearer <token>`)

The admin console uses the same handlers at `/api/admin/artifacts/…` with the admin session.

| Method | Path | Body / notes |
|---|---|---|
| GET / POST | `artifacts` | List; create `{title, html?, files?: [{path, content \| base64, contentType?}], slug?, note?, access?}` |
| GET / PATCH / DELETE | `artifacts/:ref` | Detail; `{title?, slug?, responses?: {who, open, feedback, notifyOwner}}`; delete everything |
| POST | `artifacts/:ref/versions` | `{html?, files?, uploads?: [uploadId], removeFiles?, replace?, note?}` |
| POST | `artifacts/:ref/rollback` | `{version}` |
| GET / PUT / DELETE | `artifacts/:ref/files/<path>` | Download; raw body ≤ 15 MB as a new version; remove |
| POST | `artifacts/:ref/uploads` | `{path, size, contentType?, fingerprint?}` → `{id, partSize, partCount, received}`; same fingerprint resumes |
| PUT | `uploads/:id/parts/:n` | Raw part, exactly `partSize` bytes (16 MiB) except the last |
| GET / DELETE | `uploads/:id` | Status / abort |
| POST | `uploads/:id/complete` | `{stage?: true, note?}`: a new version with the file, or staged for `versions.uploads` |
| PUT | `artifacts/:ref/access` | `{kind, role?, password? \| generatePassword?: true}` (generated password returned once) |
| GET / PUT | `artifacts/:ref/shares` | List; `{email, role, alias?, notify?: true}` (notify false → a new account's password returned once) |
| DELETE / POST | `artifacts/:ref/shares/:account` (`/resend`) | Remove; resend the invitation |
| GET / PATCH / DELETE | `accounts`, `accounts/:account` | List with shares; `{alias}`; delete |
| POST | `accounts/:account/reset` | `{notify?: true}` ends sessions; email link or password returned once |
| GET / PUT | `artifacts/:ref/state` | `?rev=`; `{state, baseRev?}` |
| GET | `artifacts/:ref/state/history` | Newest 500 revisions are kept |
| GET / DELETE | `artifacts/:ref/responses`, `…/responses/:id` | `?format=csv` |
| GET / PUT / DELETE | `artifacts/:ref/answer-key` | `{key}` |
| GET / POST / DELETE | `tokens`, `tokens/:id` | Owner session only, never a token. Token returned once on create |
| GET | `storage` | Used, cap (20 GB) and per artifact |

Limits: 40 MB request body, 15 MB per inline file, 1 GB per uploaded file, 20 GB in total (refused before any part is accepted), 300 files per version, 2 MB of state, 256 KB per response.

## CLI and MCP

`scripts/artifacts.mjs` (no dependencies, Node 22+) covers every operation and uploads large files in resumable parts. Token in `~/.config/artifacts/token` with mode 600 (or `ARTIFACTS_TOKEN_FILE`); server from `ARTIFACTS_URL`. Run it without arguments for usage. Every command prints JSON with the artifact's `url`.

```sh
node scripts/artifacts.mjs publish ./deck --slug kickoff-acme --title "Kickoff Acme"   # creates or publishes a new version matching the folder
node scripts/artifacts.mjs access kickoff-acme link --role viewer
node scripts/artifacts.mjs share kickoff-acme andres@example.com editor --alias Andrés
node scripts/artifacts.mjs state history kickoff-acme
```

MCP: streamable HTTP at `https://artifacts.inakilozano.com/mcp` with the same bearer token; tools mirror the agent API except large uploads.

To make the tools available to every agent, register the endpoint in the agent hub once (needs an admin grant; the `shared-mcp-hub` skill has the details):

1. Create an API token in the console (Artifacts → API tokens) and store it in the keys hub as service `artifacts-inaki`.
2. Register an HTTP MCP server named `artifacts` with `hub_admin_register_mcp`: URL `https://artifacts.inakilozano.com/mcp`, bearer authentication with that key.
3. Check it with `hub_search_tools` (query `artifacts`): `create_artifact` and `share_artifact` should be listed.

## Operations

- Tests: build once with `NEXT_DIST_DIR=.next-test npx next build`, then `npm run test:artifacts` (HTTP, both origins), `npm run test:artifacts:encoder` (ffmpeg), `npm run test:artifacts:browser` (Chromium). They start and remove their own PostgreSQL, MinIO and Redis containers on 127.0.0.1:55490-55494.
- Environment for the app and the encoder: `ARTIFACTS_S3_ENDPOINT`, `ARTIFACTS_S3_BUCKET`, `ARTIFACTS_S3_ACCESS_KEY`, `ARTIFACTS_S3_SECRET_KEY`, plus the existing `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET` and SMTP settings. `ARTIFACTS_APP_ORIGIN` and `ARTIFACTS_CONTENT_ORIGIN` default to the production hostnames.
- API tokens: create and revoke them in the console (Artifacts → API tokens). A **limited** token only reaches the restricted artifacts it created and cannot share them, change their general access or delete them; use it for automations such as the CRM.
