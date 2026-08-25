# Portfolio Agent Instructions

This project provides the VPS portfolio site.

Read [`../AGENTS.md`](../AGENTS.md) before you work.

Keep local commands and service facts in this file.

## Domains / nginx

- Canonical domain: `https://inakilozano.com` (proxied by Cloudflare). `www.inakilozano.com` 301s to apex — see the `www.inakilozano.com -> apex` server block in `/home/ubuntu/vps/nginx/nginx.conf`. Without that block, www falls through to credipana (first/default server) and leaks that app under this domain. This was the cause of the GSC "noindex"/`/sistema/index.php` reports (July–Aug 2026).
- Old `/sistema/*` URLs on the apex are legacy credipana paths; they 404 via Next.js, which is correct. GSC "Page with redirect" / 404 entries for them are informational — mark as fixed in Search Console.

## SEO

- Use the `seo-course` skill (course playbook in `~/.config/opencode/skills/seo-course/course/`) for content/keyword/authority strategy across all projects; pair with the `seo`, `schema-markup`, and `core-web-vitals` skills for implementation.

