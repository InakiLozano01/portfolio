# Portfolio maintenance, 7 September 2026

The owner requested forward integration, branch cleanup, and continued hardening. They also supplied Search Console indexing reports.

## Worktree cleanup

Opening main: `7d94b1b481fbfe77c3dea3536fe210ee3355b46f`.

| Accepted branch | Candidate |
| --- | --- |
| `worktree-agent-portfolio-meta-ethos-20260902` | `9c6ca347a0f087478588c76d0ce056c9dc842493` |
| `worktree-agent-portfolio-meta-ethos-v2-20260902` | `3ab83c738e88cfe21f71830fc173cb25ce4263be` |

Both candidates were already ancestors of main. Both worktrees had clean source state and no visible direct process or Docker mount users. Git removed them without force. Git also deleted the two merged branches and `feat/i18n-comments-email-pdf-media`, which pointed to the first candidate. Their directories used about 272 MiB. All accepted commits remain in main history.

Portfolio now has one local branch and no linked worktrees. Separate active sessions own Floods Argentina and Ethos. Their work remains preserved. The cross-repository inventory is recorded at `/home/ubuntu/vps/docs/worktree-convergence-2026-09-07.md`.

## Search Console findings

These are observations from public HTTP requests on 7 September, not a Google indexing decision.

| Report | Live result | Action |
| --- | --- | --- |
| Root, HTTP, www, and trailing slash redirects | Redirects finish at `/en`, which returns 200. `/es` also returns 200. | Keep these canonical redirects. |
| Old `/sistema` paths | Final status is 404. | Keep 404 for the unrelated legacy application paths. |
| HTTP www returned 403 on 23 August | The URL now returns 301. A request with a Googlebot user agent also returns 301. | Run Search Console's live inspection, then validate the old 403 report. A user-agent probe does not prove access from Google's IP addresses. |
| Hermes blocked by robots | Hermes requires Nous authentication. Its origin robots URL now redirects to login; Cloudflare serves managed robots content. | Keep the private application protected. Do not open it for indexing. |
| Sitemap lists two discovered URLs, last read in December 2025 | The current sitemap returns 200 and lists 28 URLs. Every URL returned 200 directly, with a matching canonical and no `noindex`. | Resubmit the same sitemap in Search Console. |

Public Portfolio robots rules permit crawling and exclude admin/API paths. No public page access rule needed removal. Root and legal sitemap entries no longer use request time as their modification date. Blog and project entries retain database modification dates.

Google documents [redirect and 404 handling](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes), [robots limits](https://developers.google.com/search/docs/crawling-indexing/robots/intro), and [sitemap submission and modification dates](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). None guarantees indexing. Search Console submission and live inspection require the owner's authenticated session; this run did not submit them.

## Hardening

- Exclude all root and nested `.env*` files from Docker build context. Compose supplies runtime environment files.
- Use Node 22 in each Docker stage.
- Update the dependency lock forward. All 118 changed existing package versions increased. Remove unused `copy-webpack-plugin`; the existing TinyMCE copy script already handles assets.
- Upgrade the existing mail alias to Nodemailer 9.1.1 and Sharp to 0.35.4. Use that mail alias in the archive script too. No email was sent.
- Keep a networkless dependency check in `scripts/check-security-dependencies.cjs` for malformed auth headers, HTML sanitization, JPEG processing, and in-memory MIME generation.

The old installed auth package failed the new malformed-header check with `URIError`. The updated dependency set passes. A clean install using the Dockerfile's `npm ci --include=dev --omit=peer` command passes. The full dependency audit, which includes production packages, reports zero findings. The opening production-only audit had 14 findings, including one critical and nine high findings.

The design hook's two image warnings in `send-archive-once.js` are false positives. They identify regular expressions that parse image tags, not rendered empty image elements. No suppression was added.

## Verification and deployment

All checks use capped Docker containers through the VPS verification gate. The clean source copy contains no production environment files. The dependency check, all 16 Jest tests across nine suites, the full TypeScript check, and the production Next build pass. The built standalone server also passes six public routes, two redirects, and sitemap date checks. This isolated smoke uses synthetic build mode, without a production database connection.

No remote push, production rebuild, service restart, database operation, credential change, or Search Console mutation has occurred. These source changes require a production image rebuild and deployment before they affect the live application.
