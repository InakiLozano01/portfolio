---
name: artifacts-publish
description: "Publish, version, share and manage HTML artifacts on artifacts.inakilozano.com, Iñaki's never-indexed artifact server: presentations, forms, quizzes, interactive tools and video. Use for \"publish it on artifacts\", \"give me an artifact link\", \"share this with <person> as viewer/editor\", \"<client> needs to be able to edit it\", \"put a password on it\", \"make it private\", \"collect answers / make a quiz\", \"upload this video\", \"what did <person> change\", \"export the responses\", or when another skill has a finished interactive HTML for one of Iñaki's own clients (not 021, which uses slides-publish)."
---

# artifacts-publish

Output: the artifact's URL `https://artifacts.inakilozano.com/<slug>`, which every command returns, and whatever the owner must hand over by hand (a generated password is shown once: give it to Iñaki, never to anyone else).

Reference: `artifacts/README.md` in the portfolio repo (InakiLozano01/portfolio). Vocabulary: general access, shared password, share, account, role (viewer, responder, editor), state, response, answer key.

## Two ways in

- **CLI** (any shell with the repo): `node scripts/artifacts.mjs <command>`. Token in `~/.config/artifacts/token` (mode 600). Never print or ask for the token; if the file is missing, tell Iñaki to create a token in the admin console (Artifacts → API tokens).
- **MCP** (no shell): the artifacts tools through the agent hub (`hub_search_tools` "artifacts"): `create_artifact`, `publish_version`, `set_general_access`, `share_artifact`, `get_state`, `export_responses`, `set_answer_key`, … Same operations, except large uploads, which need the CLI.

## Recipes (CLI)

- **Publish a folder or a page**: `publish ./dir --slug <slug> --title "<title>"`. Run it again to publish a new version that matches the folder; unchanged files are not re-sent. Large files and videos upload in resumable parts; rerun the same command after an interruption.
- **Who can open it**: new artifacts are restricted (only Iñaki). `access <slug> link --role viewer` for anyone with the link; `access <slug> password --role viewer --generate` for a shared password (returned once); `access <slug> restricted` to close it. Tightening cuts off open pages at once.
- **Share with a person**: `share <slug> <email> viewer|responder|editor [--alias Name]` emails an invitation; the person sets their own password once and uses one account for everything shared with them. `--no-email` returns a password once instead. `unshare`, `resend`, `shares <slug>`, `accounts`, `reset <email>`.
- **Editable artifact**: in the HTML use `await artifact.ready`, `artifact.getState()`, `artifact.saveState(state, {baseRev})`; share as editor. Seed with `state put <slug> --json '{…}'`; report changes with `state history <slug>` and `state get <slug> --rev N`.
- **Form or quiz**: in the HTML call `artifact.submitResponse(answers, {name, email})` and `artifact.getResponse()`. Choose who answers with `responses settings <slug> --who account|declared|anonymous`, what they see with `--feedback none|score|answers`, `--notify` to email Iñaki, `--closed` to stop. Grade with `answer-key <slug> key.json` (`{"q1": {"answer": "b", "points": 1}}`); it is never served to visitors and regrades existing responses. `responses export <slug> [--csv]`.
- **Video**: put the file in the folder and write `<video data-artifact-video="media/talk.mp4" controls></video>`. It encodes to adaptive HLS after upload (minutes); the page says so meanwhile. Up to 1 GB per file, 20 GB in total. YouTube/Vimeo/Drive embeds also work.
- **Housekeeping**: `get`, `list`, `rename <slug> --title … --slug …` (old links break), `rollback <slug> <version>`, `delete <slug> --yes`, `storage`.

Assets must use relative paths. Check the returned URL opens before handing it over.
