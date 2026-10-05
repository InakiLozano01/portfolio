# Portfolio consolidation, 2026-10-05

The accepted release is `05f3c48`, following PostgreSQL recovery `2958084`,
invoices `1b2a3bb` and admin loading/Jev moderation `30bded2`.

## Git review

The following remote branch tips are already ancestors of the accepted release:

| Branch | Tip |
| --- | --- |
| `codex/asegurar-salto-de-línea-en-dockerfile` | `31bf3df` |
| `codex/crear-script-entrypoint.sh-y-actualizar-dockerfile` | `4a50a1c` |
| `codex/encontrar-y-corregir-un-fallo` | `befb183` |
| `codex/revisar-base-de-código-y-proponer-tareas` | `46895e1` |
| `f8sc4b-codex/revisar-base-de-código-y-proponer-tareas` | `13688db` |

`tecxzu-codex/revisar-base-de-código-y-proponer-tareas` at `27d3b8d`
contains an early comments implementation. The current release already includes
its alias form, approved comment listing, model and rate limiting, plus Jev
moderation, administrator overrides, privacy protections, threading and voting.
The old Google moderation endpoint and fail-open behavior are superseded. Its
two card hover changes belong to the former public card layouts. Record the
reviewed branch as merged while preserving the accepted application tree.

The independent invoice checkout is clean at `1b2a3bb`; the older recovery
checkout is clean at `2958084`. Both releases are included in `main`.

Two legacy design stashes are recovery archives, not accepted application code.
One changes the public theme/font, rewrites public components and removes existing
accessibility details; the other changes dimensions in the former homepage
layout. Preserve both complete commits and patches in a verified private bundle
rather than applying those alternative layouts to the tested release.

Private Git bundles, pending changes, archived checkout sources and the cleanup
ledger are archived under `/home/ilozano/archive/portfolio/2026-10-05/cleanup`.
Both stash commits were checked for recoverability from a separate bare repository.
Existing deletions of `AGENTS.md` and `CLAUDE.md`, and the maintenance document
correction, are included in this consolidation. The README now describes the
actual PostgreSQL deployment and OpenRouter moderation.

## Runtime preservation

Keep the production application image `portfolio-admin:05f3c48`, PostgreSQL,
Redis, uploaded assets, private environment files, database recovery exports and
backups. Keep the application rollback image `portfolio-admin:30bded2` and its
deployment manifest in `/home/ilozano/archive/portfolio/2026-10-05/admin-ui-release`.
The PostgreSQL base image remains available for recovery and rebuilding.

Remove only Portfolio's obsolete candidate service, unreferenced intermediate
images and generated build/browser/test contexts. Other VPS projects have active
verification jobs and are outside this cleanup. No global Docker prune is used.

This consolidation changes documentation and Git history, not application
behavior. The application tests and browser validation remain those recorded in
the two admin release documents. Check the final diff, secret exclusion, branch
ancestry, remote synchronization and public health after cleanup.

## Home directory archives

Release evidence, cleanup recovery bundles, cutover backups and inactive database
recovery material are grouped under `/home/ilozano/archive/portfolio/2026-10-05`.
`archive-index.json` maps previous locations to verified archived paths and records
file hashes. Generated font verification dependencies were removed after checks;
their lockfile and synthetic PDF evidence remain private.

The live PostgreSQL password/app environment and application Compose file remain
under `/home/ilozano/portfolio-db-recovery-20261002T125907Z`. The current application
deployment manifest and font configuration rollback remain under
`/home/ilozano/portfolio-invoice-font-release-20261005`. These are runtime inputs.

The separate Floods recovery bundle/patches are preserved under
`/home/ilozano/archive/floodsargentina/convergence-20260925`. The Ethos worktree
`/home/ilozano/ethos-quota-lifecycle-20260926` at `566e2dbe9` has four commits absent
from Ethos main, including an unreviewed migration journal reservation. It remains
available for that project's review and is not discarded or merged into Portfolio.
