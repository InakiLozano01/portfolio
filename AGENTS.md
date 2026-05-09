# portfolio — Agent Instructions

## ⚠️ Resource Discipline (VPS-wide rule — non-negotiable)

**Never run `npm`, `pnpm`, `python`, `pytest`, `next build`, `tsc`, etc. on the host shell.** Everything runs in Docker, and every container MUST declare `deploy.resources.limits.cpus` and `...memory` in `docker-compose.yml`. Ad-hoc `docker run` / `docker compose run` MUST pass `--cpus` and `--memory`.

This VPS is 8 CPU / 32 GB shared by ~40 containers; see `/home/ubuntu/vps/AGENTS.md` for the full rule. Before adding load, check `uptime` (load < 8) and `docker stats --no-stream`.

## TypeScript verification (VPS-wide)

Do **not** run raw host `npx tsc`, `npm run typecheck`, `pnpm tsc`, or `tsc --noEmit --incremental false`. For TypeScript projects, use the shared capped wrapper:

```bash
/home/ubuntu/vps/scripts/vps-typecheck.sh /home/ubuntu/vps/<project>
```

The wrapper runs inside Docker with CPU/memory/pids caps, refuses to start when host load is already high, prefers repo-local `tsgo --singleThreaded` when available, and otherwise uses cached incremental `tsc` with `.cache/tsbuildinfo/typecheck.tsbuildinfo`. If this project intentionally adopts `@typescript/native-preview`, keep it repo-local and let the wrapper discover `node_modules/.bin/tsgo`. Raise `VPS_TYPECHECK_CPUS`, `VPS_TYPECHECK_MEMORY`, or `VPS_TYPECHECK_FORCE=1` only with an explicit reason.
Use `VPS_TSC_COLD=1` after merge/reset/rebase recovery when stale build info is the concern; it keeps the check capped while using a fresh build-info file.

If this project has no TypeScript today, keep this rule for any future JS/TS checker added here.

## ⚠️ Port Binding (CRITICAL — VPS-wide rule)

**Every published port in `docker-compose*.yml` MUST bind to `127.0.0.1`, never `0.0.0.0`.** Public traffic enters via Cloudflare → host nginx (`network_mode: host`) → containers on loopback. Bypassing nginx skips TLS, WAF, and per-vhost rules.

```yaml
# WRONG: ports: ["3000:3000"]
# RIGHT: ports: ["127.0.0.1:3000:3000"]
```

If the port is only consumed by sibling containers in the same compose file, prefer dropping `ports:` entirely and use Docker network DNS. Full rule + verification commands at [`/home/ubuntu/vps/AGENTS.md`](../AGENTS.md) §2.

Running containers for this project:
- `portfolio-portfolio-1` — Next.js app
- `portfolio-mongodb-1` — MongoDB 8
- `portfolio-redis-1` — Redis

To deploy / rebuild, always use Docker Compose from this directory:
```
docker compose up -d --build
```

## Coding Discipline — Karpathy Guidelines

When writing, reviewing, or refactoring code, follow `karpathy-guidelines`
(full text in the root `/home/ubuntu/vps/AGENTS.md` §8 and each coding
agent's local skill store):

1. **Think before coding** — surface assumptions, ask when unclear,
   push back if there's a simpler path.
2. **Simplicity first** — minimum code that solves the problem, no
   speculative abstractions or unrequested features.
3. **Surgical changes** — touch only what the task requires, match
   existing style, don't refactor adjacent code.
4. **Goal-driven execution** — define verifiable success criteria
   before coding; for multi-step work, state a brief plan with a verify
   step per item.
