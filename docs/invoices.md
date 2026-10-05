# Private admin invoices

This feature is based on PostgreSQL recovery commit `2958084` and is deliberately
separate from the database cutover candidate. It adds Invoices to `/admin#invoices`.
Nothing imports, changes, signs or sends historical invoices. No fiscal service,
signature, payment processor, email dispatch or automatic payment confirmation is
implemented.

## Data and workflow

- Enter issuer/client fields, an issue date and one or more items. The reference
  has one implied unit per item: no quantity, tax or discount fields are invented.
  USD is the supported currency. Prices are decimal strings with two fractional
  digits at most; server-side BigInt arithmetic supplies line and invoice totals.
- Save reserves `INV-YYYY-NNNNN` using a PostgreSQL counter upsert and a unique
  constraint. This separate namespace avoids colliding with the historical
  `YYYY_NNNNN` series. A client UUID makes retried creates idempotent; retries may
  leave number gaps. Changing the date later does not renumber the invoice.
- A calendar date is stored as `YYYY-MM-DD` in the snapshot, not a timestamp.
  Rendering formats the components directly without timezone conversion.
- Content edits require the latest revision. Conflicting edits return 409 rather
  than overwriting someone else's changes. Saved invoices are never deleted by
  this module.
- Export locks the invoice, verifies its revision and generates at most one PDF
  per revision. A snapshot, complete PDF bytes and SHA-256 are stored in PostgreSQL.
  Downloads read those bytes; they never re-render a historical PDF. Database
  triggers reject UPDATE/DELETE on export and payment event rows.
- New invoices start unpaid. Manual paid/unpaid/unknown changes have their own
  optimistic version and append-only audit events; they do not alter PDF content
  revisions. Unknown remains available for uncertain historical payment state,
  but this feature does not import any historical invoice.

## Private routes

Every handler calls the existing `requireAdmin(request)` before parsing input,
accessing storage or rendering. A persisted admin is required, including for GET
and PDF downloads. The existing origin checks apply to mutations. JSON and PDF
responses, including errors and authentication failures, have private/no-store
cache headers. Bodies are stream-limited to 128 KiB; input rejects unexpected
properties, injected totals, invalid dates/amounts and excessive text/items.

| Method | Under `/api/admin/invoices` | Purpose |
| --- | --- | --- |
| GET | `?offset=0` | 50-record history page |
| POST | `/` | Idempotent create `{requestId, invoice}` |
| GET | `/:id` | Current data, exported revisions, payment history |
| PUT | `/:id` | Content update `{revision, invoice}` |
| PATCH | `/:id/payment` | Manual `{version, status}` |
| POST | `/:id/exports` | Preserve saved `{revision}` as PDF |
| GET | `/:id/exports/:revision` | Download immutable PDF |

No PDF is placed in `public/`, uploaded to object storage, or exposed via a
public URL. User text is rendered as text; no user-controlled image/font paths,
HTML, URLs to fetch, or scripts are accepted. Errors do not print invoice data or
connection details.

## Reference and typography

The authoritative original SHA-256 is
`b62d00b0edc7caac2d01d3c09109bd7f0bc94279ed34c88db131dfb5ed803e16`.
Its source and signature are kept outside this repository. Only the two logo
assets are used. No signature asset is copied into the application.

The renderer uses the original 596 × 842 pt page, table widths, borders, headings,
logos, USD presentation and original `AMMOUNT` spelling. It leaves the signature
area blank. Complete official Roboto Mono is bundled under its SIL-OFL license,
from https://github.com/googlefonts/RobotoMono, commit
`895ec691990d041dd727c7b5afa3ce56525d98e6`.

The owner approved Liberation Sans on 2026-10-05. Normal PDF export uses the bundled
SIL-OFL Liberation Sans through the private runtime setting
`INVOICE_FONT=liberation-sans`; Roboto Mono remains the font for URL text.
The alternative is accepted for invoices and does not claim exact Arial typography.
No complete authorized Arial was found in the notebook/VPS font directories or
portfolio assets, and the original subsets are insufficient.

The renderer still refuses normal exports with 503 if the approved runtime setting
is absent and complete `Arial.ttf` and `Arial-Bold.ttf` are unavailable in
`INVOICE_ARIAL_DIR` (or the private asset directory). Never commit proprietary font
files without redistribution permission. No new font agreement or paid license
was accepted. This runtime change does not alter previously stored PDF bytes.
Row height reflows with text; bounded continuation rows preserve long descriptions
and long tokens across pages. Proofs are visibly marked NOT ISSUED and UNSIGNED.

## Deployment and recovery

PostgreSQL and invoices are deployed. The following procedure remains the contract
for future schema/image replacements. Font activation changes the private runtime
environment and replaces only the application container using its existing image.

1. Complete/approve the PostgreSQL migration cutover separately. Do not substitute
   this feature branch for the already-verified migration candidate.
2. Review and approve this feature commit and its QA evidence independently.
3. Back up the live PostgreSQL database, including any invoice tables if present,
   and retain the prior image. Verify a restore in an isolated destination.
4. With the existing authorized migration-owner connection, explicitly run
   `node scripts/invoices/migrate.cjs`. The additive migration does not touch the
   recovered collections. It never runs at application startup. Do not create a
   new account/credential or expand grants without approval.
5. Grant the existing application role USAGE on schema `portfolio`, SELECT/INSERT/
   UPDATE on `invoices` and `invoice_counters`, and SELECT/INSERT only on
   `invoice_exports` and `invoice_payment_events`. Grant no DELETE, TRUNCATE or DDL.
   Migration ownership must remain separate so the app cannot drop history guards.
   Exact role names come from the approved deployment context; none are guessed.
6. Build and stage a separate image. Dockerfile and Next output tracing include
   private font/logo assets. Test unauthorized GET/PDF, real admin interaction,
   synthetic create/edit/export/payment flow and backup/restore of an export.
7. Only after explicit approval, replace the application image and smoke-test.
   Rollback changes only the image; keep additive invoice tables and all histories.
   Do not drop tables or restore an old database over newer invoice data.

## Reproducible checks

`npm test -- --runInBand`, `node --test scripts/invoices/test-store.cjs`,
`npm run test:postgres`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

The invoice store suite defaults to an isolated PGlite engine. Real concurrent
transactions can be tested with `INVOICE_TEST_SOCKET` pointing only to the private
temporary QA socket accepted in the test script; it refuses any database already
containing a portfolio schema and never uses `DATABASE_URL`.
Set `INVOICE_TEST_PDF=true` for the same suite to persist actual watermarked,
unsigned PDFs from the renderer. This mode was exercised against PostgreSQL 16;
the resulting PDFs were backed up, restored and compared byte for byte.

`node scripts/invoices/render-proofs.cjs [private-reference-json]` generates only
unsigned, watermarked local QA fixtures under ignored `.qa/pdf`, without DB access
or number allocation. Render all pages with Poppler and inspect them for overflow,
accents, continuity and differences from the preserved original.
