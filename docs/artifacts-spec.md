# Artifacts: sharing, responses and video

Vocabulary follows `GLOSSARY.md`. Decisions recorded in ADR 0001 (artifacts inside the portfolio app) and ADR 0002 (uploaded video is encoded to HLS) are binding.

## Problem Statement

The owner publishes HTML artifacts for clients at `artifacts.inakilozano.com`, but the server only half does the job:

- An artifact is either open to anyone or locked behind per-artifact usernames, and everyone who logs in can edit. There is no way to let someone only look.
- The owner cannot keep an artifact to themself with their own login, and cannot protect one with a single password.
- A person who receives three artifacts gets three unrelated usernames and passwords, handed over by hand.
- An artifact cannot ask questions and record who answered what.
- Video does not work: files over 15 MB are refused and playback cannot seek.
- Agents can only create and list artifacts through the keys hub; everything else needs raw HTTP, and nothing large gets through.
- It is a separate server with its own database, cut off from the portfolio's login and mail.

## Solution

Artifacts become part of the portfolio app. The owner signs in with their portfolio admin login and manages every artifact from an Artifacts section in the admin console, or from a Share button on the artifact itself.

Each artifact has a general access (restricted, anyone with the link, or anyone with the shared password) and a list of shares with accounts, each with a role: viewer, responder or editor. People get an invitation by email, set their own password once, and use that one account for everything shared with them.

An artifact can ask questions. Each person's response is stored separately from the state, the server can grade it against an answer key nobody can read, and the owner exports all responses.

Video is uploaded in parts, encoded to several qualities and streamed behind the artifact's access control. Presentations, interactive pages and forms are ordinary artifacts.

Agents get a CLI that does everything and an MCP endpoint registered in the agent hub.

## User Stories

### Owner access

1. As the owner, I want to sign in to artifacts with my portfolio admin login, so that I have one password.
2. As the owner, I want to open any artifact regardless of its general access, so that I am never locked out of my own work.
3. As the owner, I want changing my admin password to end my artifacts sessions, so that a leaked session stops working.
4. As the owner, I want an artifact that is restricted and has no shares to be reachable only by me, so that I can keep drafts private.

### General access

5. As the owner, I want to set an artifact's general access to restricted, anyone with the link, or anyone with the shared password, so that I choose how far it travels.
6. As the owner, I want to choose the role that general access grants, so that a link can be view-only while invited people edit.
7. As the owner, I want to set or generate the shared password and change it later, so that I can cut off everyone who had the old one.
8. As a visitor with the link to a link-access artifact, I want to see it without logging in, so that opening it costs nothing.
9. As a visitor to a shared-password artifact, I want to enter one password and get in, so that I do not need an account.
10. As a visitor to a restricted artifact, I want to see only a sign-in screen, so that nothing about the artifact leaks, not even its title.
11. As the owner, I want content links already issued to stop working when I restrict an artifact or change its shared password, so that tightening access takes effect at once.
12. As the owner, I want failed sign-in and shared-password attempts to be rate limited, so that passwords cannot be guessed.

### Accounts and sharing

13. As the owner, I want to share an artifact with a person by email and a role, so that they get exactly the access I intend.
14. As the owner, I want to give an account an alias, so that their name shows instead of their email.
15. As the owner, I want to change a share's role or remove it, so that access follows the relationship.
16. As the owner, I want removing a share to end that account's access to the artifact immediately, so that revocation is real.
17. As the owner, I want to see every share of an artifact and every artifact shared with an account, so that I know who can reach what.
18. As the owner, I want to delete an account, so that a person loses access to everything at once.
19. As a person with an account, I want one email and password to open every artifact shared with me, so that I do not juggle credentials.
20. As a person with both a share and general access, I want the higher of the two roles, so that being invited never reduces what I can do.
21. As a viewer, I want to see the artifact and its state without being able to change anything, so that I can follow along safely.
22. As an editor, I want to change the artifact's state, so that I can do the work it was shared for.
23. As an editor, I want to be told when someone else saved before me, so that I do not overwrite their change.
24. As an editor, I want to see the state's revision history, so that I can check what changed and who changed it.
25. As the owner, I want editors never to be able to change the artifact's HTML or files, so that only I and my agents publish.
26. As the owner, I want sharing to be mine alone, so that nobody passes access on.

### Invitations and passwords

27. As the owner, I want sharing to send an invitation email by default, so that the person learns about the artifact without me writing to them.
28. As an invited person without an account, I want a single-use link that lets me choose my password, so that the owner never knows it.
29. As an invited person who already has an account, I want the invitation to link straight to the artifact, so that I just sign in.
30. As the owner, I want to share without sending email and get a generated password once, so that I can hand credentials over another way.
31. As a person with an account, I want to reset my password by email, so that forgetting it does not need the owner.
32. As the owner, I want to reset an account's password and end its sessions, so that I can respond to a leak.
33. As the owner, I want to resend an invitation, so that a lost email is not a dead end.
34. As a person with an account, I want to sign out, so that a shared computer does not keep my session.

### Responses

35. As the owner, I want an artifact to collect responses, so that forms, surveys and quizzes record what people answer.
36. As the owner, I want to choose per artifact who can respond: anyone anonymously, anyone who declares a name or email, or only signed-in accounts, so that the identity fits the purpose.
37. As a responder, I want to submit my answers from the artifact, so that filling a form is one step.
38. As a responder, I want to reopen and correct my response until the owner closes responses, so that a mistake is not final.
39. As a responder, I want my response to be invisible to other responders, viewers and editors, so that my answers stay between me and the owner.
40. As a signed-in responder, I want exactly one response per artifact tied to my account, so that I cannot be counted twice.
41. As a visitor to a shared-password artifact, I want to respond anonymously or with a declared name, so that I can answer without an account.
42. As the owner, I want to close and reopen responses, so that I control the collection window.
43. As the owner, I want to see all responses to an artifact with who sent each and when, so that I can read them.
44. As the owner, I want to export responses as CSV or JSON, so that I can analyse them elsewhere.
45. As the owner, I want to delete a response, so that test submissions do not pollute results.
46. As the owner, I want to turn on an email to me for each new response, per artifact, so that I notice submissions that matter.
47. As a responder who gave an email, I want a copy of what I submitted, so that I have a record.
48. As an artifact author, I want fillable fields, multiple choice and free-text questions to be plain HTML and JavaScript calling the artifact client, so that any form design is possible.

### Grading

49. As the owner, I want to publish an answer key for an artifact, so that the server can grade responses.
50. As the owner, I want the answer key never to be served to anyone but me, so that it cannot be read from the page.
51. As the owner, I want to choose what a responder sees after submitting: nothing, their score, or their score and the correct answers, so that a quiz can teach or only measure.
52. As a responder to a graded artifact, I want my score when the artifact allows it, so that I know how I did.
53. As the owner, I want scores in the response list and the export, so that I do not grade by hand.
54. As the owner, I want replacing the answer key to regrade existing responses, so that fixing a wrong key fixes the scores.

### Video, presentations and interactive artifacts

55. As the owner, I want to upload a video of up to 1 GB to an artifact, so that I can share recordings.
56. As the owner, I want an interrupted upload to resume, so that a dropped connection does not cost the whole file.
57. As a viewer, I want video to start quickly, seek anywhere and adapt to my connection, so that watching works on a phone.
58. As a viewer, I want a poster image before the video plays, so that the page is not a black box.
59. As the owner, I want video to be reachable only by people who can see the artifact, so that a private recording stays private.
60. As the owner, I want to see whether a video is still encoding or failed, so that I know when the artifact is ready.
61. As a viewer of an artifact whose video is still encoding, I want to be told so, so that I do not think it is broken.
62. As the owner, I want uploads refused with a clear message once artifacts storage reaches its cap, so that the server's disk is never filled.
63. As the owner, I want to see how much storage each artifact uses, so that I know what to delete.
64. As an artifact author, I want to embed external video (YouTube, Vimeo, Drive), so that I can use what is already hosted.
65. As an artifact author, I want a presentation to be an ordinary artifact with slides and videos inside, so that there is nothing special to learn.
66. As an artifact author, I want JavaScript, forms and interactive widgets to run in the artifact, so that it can be a real tool.
67. As the owner, I want artifact code never to be able to read my admin session, other artifacts or the API, so that publishing a client's HTML is safe.

### Admin console

68. As the owner, I want an Artifacts page in the admin console listing every artifact with its general access, shares, responses and storage, so that I have one overview.
69. As the owner, I want a share dialog like Google Docs: general access on top, people and roles below, so that sharing is familiar.
70. As the owner, I want a Share button on the artifact when I open it signed in, so that I can share from where I am.
71. As the owner, I want to rename, change the slug of, and delete an artifact from the console, so that I do not need an agent for housekeeping.
72. As the owner, I want to see versions and roll back to one, so that a bad publish is recoverable.
73. As the owner, I want to create and revoke API tokens from the console, so that I control which agents can publish.

### Agents

74. As an agent, I want a CLI that publishes a folder as an artifact, including large files, so that one command ships a deck with its videos.
75. As an agent, I want the CLI to publish a new version, roll back, rename and delete, so that the whole lifecycle is scriptable.
76. As an agent, I want the CLI to set general access and manage shares, so that "share this with Andrés as editor" is one command.
77. As an agent, I want the CLI to read and seed state and list its history, so that I can prepare an editable artifact and report what a person changed.
78. As an agent, I want the CLI to publish an answer key and export responses, so that I can run a quiz end to end.
79. As an agent without a shell, I want the same operations as MCP tools through the agent hub, so that I can publish and share from any session.
80. As an agent, I want every command to return the artifact's URL, so that I can give the owner a link.
81. As the owner, I want the artifacts-publish skill to describe the CLI and MCP tools as they are, so that agents stop using the old service.

### Migration

82. As the owner, I want the one existing artifact to keep its slug after the move, so that the link I already shared still works.
83. As the owner, I want the old server, its data and the duplicate keys-hub service removed, so that there is one artifacts system.
84. As the owner, I want artifacts never to be indexed by search engines, so that sharing a link is the only way to find one.

## Implementation Decisions

### Shape

- Artifacts is a module of the portfolio Next.js app (ADR 0001). The standalone Node server and its SQLite database are deleted.
- Two hostnames are served by the same app process, told apart by the request host:
  - the app origin `artifacts.inakilozano.com`: viewer shell, sign-in, invitation and password pages, the guest API, the agent API and the MCP endpoint;
  - the content origin `artifacts-content.inakilozano.com`: artifact files only, GET and HEAD only.
- Artifact HTML is served only from the content origin, inside a sandboxed iframe without `allow-same-origin`, with a sandbox CSP on every content response. The content origin never reads or sets cookies. Content URLs keep the signed, expiring capability bound to artifact, version and an epoch that is bumped whenever access is tightened.
- The artifact talks to the server only through the injected client and `postMessage` to the shell, as today. The client contract keeps its current calls and gains: the caller's effective role, `getResponse`, `submitResponse` (returning the score and correct answers when the artifact allows), and video status.
- Every response on both origins carries the noindex headers and robots rules that exist today.

### Data

- Plain relational tables in the portfolio's PostgreSQL, queried with SQL through the existing `pg` pool. The Mongoose-over-Postgres document layer is not used for artifacts.
- Entities: artifact, version, file, state revision, account, share, session, invitation and password-reset token, response, answer key, upload, video rendition, API token.
- An artifact carries its general access (kind, role, shared-password hash), its response settings (who can respond, open or closed, what the responder sees, notify owner) and its storage use.
- State saves and response submissions run in transactions; state keeps the optimistic `baseRev` conflict and the 500-revision cap.
- Passwords (account and shared) are hashed with argon2id; tokens of every kind are random and stored hashed.
- The one existing artifact is republished through the new API with its slug; no data migration script. API tokens are reissued.

### Access

- The owner is whoever holds a valid portfolio admin session. The admin session is established on the artifacts app origin with the existing NextAuth setup; the admin cookie is never widened to a parent domain.
- Effective role = owner, else the highest of the account's share and the general-access role (if the visitor satisfies it), else none. One function computes it and every route uses it.
- Account sessions are a cookie on the app origin, global across artifacts, with a CSRF token per session. Shared-password entry issues a per-artifact session with no account.
- Roles: viewer reads files and state; responder also submits its own response; editor also writes state and reads history. No role changes files, shares or settings.
- Sign-in, shared-password and reset attempts are rate limited with the existing rate-limit helper.

### Mail

- Invitations, password resets, response notifications and response copies are sent through the portfolio's existing mail engine, with one new plain template. No new mail endpoint.

### Files and video

- Files live in a new MinIO container in the portfolio's compose project, reachable only from the app and the encoder. Every byte reaches a browser through the app, which checks the capability and supports range requests.
- Uploads are multipart and resumable: start, upload parts (each below Cloudflare's request limit), complete. Small files may still be sent inline.
- Limits: 1 GB per file, 20 GB total for artifacts; an upload that would cross the cap is refused before any part is accepted.
- A file whose type is video is queued for encoding. A worker container with ffmpeg, taking jobs from the portfolio's Redis, produces HLS renditions (360p, 720p, 1080p, never above the source) and a poster, then deletes the original (ADR 0002). The file's status is pending, ready or failed, and the artifact client exposes it.
- The artifact references a video by its published path; the content origin serves the HLS playlist and segments under the same capability. The injected client provides the player wiring so an author writes one element.
- nginx gets the larger body size and timeouts the part uploads need on the app origin; the content origin stays read-only.

### Responses and grading

- One response per responder per artifact. The responder is an account, a declared name or email, or an anonymous browser token, according to the artifact's setting.
- A response is a JSON document plus score fields. The answer key is a JSON document mapping question ids to correct answers and points, stored apart from files and never returned by any guest route.
- Grading is exact match per question (single choice, multiple choice as a set, normalised text). Replacing the key regrades stored responses.

### Agent API, CLI and MCP

- One versioned agent API authenticated with bearer API tokens; the admin console uses the same handlers with the admin session.
- The CLI is a dependency-free Node script in the repo that covers every agent API operation and does multipart uploads. It reads its token from a local file with mode 600.
- The MCP endpoint is streamable HTTP inside the app, authenticated with the same API tokens, exposing the agent API operations except large-file upload. It is registered in the agent hub, and the keys hub keeps a single `artifacts-inaki` service.
- The artifacts-publish skill is rewritten around the CLI and MCP tools, with the repo copy as its source.

### Admin console

- A new Artifacts page in the existing console, built with the console's kit: list, detail (versions, files, storage), share dialog, responses table with export, API tokens.
- The viewer shell shows a Share button to the owner, opening the same dialog.

### Delivery

- One branch and one pull request. Its first commit is the owner's pending uncommitted work, taken as is.
- After the tests pass and a security review by a subagent has no open findings, the pull request is merged and deployed without further confirmation; the existing artifact is republished and the old server is shut down.
- No backup job for artifact data, by the owner's decision.

## Testing Decisions

A good test here drives the system the way a browser, an agent or a video file does and asserts only what they can observe: status codes, response bodies, bytes served, emails captured, files produced. It does not assert table contents, function calls or internal state.

- **Seam A, the HTTP surface.** A suite that starts the app against throwaway PostgreSQL and MinIO containers with mail captured instead of sent, and exercises both origins over HTTP: owner access, general access in its three kinds, effective-role resolution, shares and revocation, invitations and password reset (following the captured links), state conflict and history, responses in the three identity modes, grading and regrading, multipart upload and resume, the storage cap, range requests, capability expiry and epoch bump, the sandbox and noindex headers, the agent API, the CLI run as a subprocess, and the MCP endpoint. Prior art: the current artifacts end-to-end self-test against a throwaway server, and the repo's `node --test` PostgreSQL suite.
- **Seam B, the encoder.** A short real clip goes in; the test asserts HLS playlists, segments and a poster come out, that renditions never exceed the source, and that a corrupt file ends as failed.
- **Seam C, the browser.** Tests of the admin Artifacts page and the share dialog in a real browser against the Seam A stack: change general access, share with a role, see a response arrive, export. Component-level prior art: the existing admin and UI tests under the jest suite.
- The security properties are tests, not review notes: artifact code cannot read cookies or call the API, a viewer cannot write state, a responder cannot read another response, nobody but the owner can read the answer key, a removed share loses access at once.
- The existing route tests with a mocked database are not the model for this work.

## Out of Scope

- Editing an artifact's HTML or files from the browser.
- Live co-editing or live push of state changes between editors.
- Co-owners, or any role that can share.
- Requesting access to a restricted artifact.
- Converting PPTX or PDF into presentations.
- Passwordless sign-in by emailed link for accounts.
- Uploading large files through MCP.
- Backups of artifact data.
- Multiple forms, or multiple responses per person, in one artifact.
- Reviewing or fixing the owner's pending uncommitted changes that ride in the same pull request.

## Further Notes

- The Cloudflare plan and its per-request upload limit were not verified; part size must stay conservative.
- The VPS disk is 91% used with 37 GB free, which is why the 20 GB cap exists and originals are not kept.
- The portfolio admin session lasts 30 minutes; whether the owner's artifacts session should outlive it was not decided and follows the admin setting.
- Service is live today with one open artifact, no credentials and no state, so the cutover loses nothing.
