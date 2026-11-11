---
name: artifacts-publish
description: "Publish, version, share and manage editable HTML artifacts on artifacts.inakilozano.com, Iñaki's personal never-indexed artifact server. Use for \"publish it on artifacts\", \"give me an artifact link\", \"share this HTML with <client>\", \"<client> needs to be able to edit it\", \"make it private\", \"create a user/password for <person>\", \"what did <person> change\", or when another skill has a finished interactive HTML for one of Iñaki's own clients (not 021, which uses slides-publish)."
---

# artifacts-publish

Output: `https://artifacts.inakilozano.com/<slug>`, checked with an HTTP 200. For editors, also the username and password delivered to Iñaki, never to anyone else.

Full reference: `artifacts/README.md` in the portfolio repo (InakiLozano01/portfolio).

## Auth

The token lives in the keys hub as service `artifacts-inaki` (Bearer, prefix `/api/v1/`). Never ask for it and never print it.

- MCP: `hub_key_operation service=artifacts-inaki operation=create-artifact body={title, html, visibility?, slug?, files?}` and `operation=list-artifacts`. The hub currently returns the upstream status only, not the created URL or list data. Choose a slug when creating and verify its URL.
- For response data or artifact-specific paths, use the broker on myvps: `python3 /home/ubuntu/vps/agent-hub/packages/keys-hub/cli.py artifacts-inaki METHOD /api/v1/...`. Pass JSON bodies on stdin; the JSON response contains `status`, `etag`, and `body`. The CLI accepts at most 1 MiB of request body and does not expose a custom Content-Type; use JSON `files` rather than the raw file upload endpoint. The older `agent-keys-hub` installation may receive Cloudflare 403. SSH access to myvps is required; a hub grant alone does not provide arbitrary-path access.

## Recipes

- **Publish**: `POST /api/v1/artifacts {title, html}`. The slug comes from the title. Use relative paths for assets, or inline everything.
- **Update**: `POST /api/v1/artifacts/<slug>/versions {html, note}`. The slug stays the same. Fetch the current file first with `GET .../files/index.html`.
- **Editable by a guest**: inside the HTML, use `await artifact.ready`, `artifact.getState()` and `artifact.saveState(state, {baseRev})`. `saveState` opens the login dialog by itself. Then `POST .../credentials {username}` returns a password that is shown only once. Give it to Iñaki.
- **Private**: `PATCH .../<slug> {visibility: "private"}`. Viewing then needs a credential too.
- **What changed**: `GET .../state/history` lists who saved and when. `GET .../state?rev=N` returns a single revision.
- **Revoke a guest**: `DELETE .../credentials/<username>`.

Starter for an editable artifact: `artifacts/examples/crm-stages.html`.
