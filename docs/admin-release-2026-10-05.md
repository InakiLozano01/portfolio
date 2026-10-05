# Admin loading, comment moderation and invoices

This release builds forward from PostgreSQL recovery `2958084` and invoice feature
`1b2a3bb`. Production previously used the PostgreSQL image without the invoice
feature; the original VPS checkout still contained the MongoDB implementation.
Use `compose.postgres-app.yml`, not the older MongoDB Compose deployment.

Projects and blogs now request `?view=summary` for their lists. Full content is
loaded when opening an editor or newsletter preview. Editors and admin sections
load on demand. Project thumbnails use existing small WebP variants with explicit
display sizes. Empty local drafts cannot replace the project list, and drafts
retain the existing project's ID.

The observed project response decreased from 13,908,507 to 25,669 bytes; blogs
decreased from 174,875 to 2,603 bytes. Warm staged origin requests measured 13 ms
and 33 ms respectively. These are API timings, not public browser page timings.

Comment moderation uses OpenRouter's Decisions API with `typesafe/jev-1.13`.
Independent spam, harassment, hate, violence, sexual content, privacy and off-topic
probabilities accompany the publication decision. Conservative thresholds turn
uncertainty and provider failures into pending review. Denied comments are saved
for administrator overrides. Public responses exclude IPs, moderation evidence
and override actors. The Comments section shows categories and decisions, and the
sidebar reports pending reviews. Overrides retain the original moderation result
and append actor, timestamp and status.

Only `OPENROUTER_API_KEY` and `OPENROUTER_MODERATION_MODEL` belong in the ignored
server environment files. They are runtime settings; no credentials belong in
client code, Git, Docker build arguments or the build context.

Invoices are available under `/admin#invoices`. The additive PostgreSQL migration
was tested against an isolated restore and applied with the existing owner role.
The existing application role gets only the needed invoice table privileges;
export/payment history remains guarded against updates and deletion.

PDF export requires complete licensed Arial, or an explicitly approved alternative
through the runtime setting `INVOICE_FONT=liberation-sans`. The substitute was
tested only with synthetic invoices in an isolated restored database. Pending the
owner's font choice, production invoice creation and payment tracking are usable
while PDF export retains its font guard. No signature or invoice email is added.

Validation: 51 Jest tests, seven PostgreSQL persistence tests, nine invoice store
tests, TypeScript and the production build passed. ESLint has zero errors and
nine existing warnings. Authenticated staged browser checks covered both lists,
their real editors, repeat navigation, thumbnail loading, Comments and invoice
create/export/download/payment. Live Jev probes returned allow, review and deny;
an override retained its original decision. Backup restore checks cover the
original data and the synthetic invoice export bytes.

Private release evidence and rollback image information live outside Git at
`/home/ilozano/portfolio-admin-release-20261005`. Rollback replaces the app image
only; preserve PostgreSQL invoice tables and histories. Never restore an old
database over newer invoices or comments to undo an application deployment.
