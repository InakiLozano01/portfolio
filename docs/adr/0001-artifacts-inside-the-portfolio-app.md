---
status: accepted
---

# Artifacts live inside the portfolio Next.js app

Artifacts started as a separate, dependency-free Node process with its own SQLite file and no access to the portfolio. Sharing with accounts, email invitations and an owner login all needed the portfolio's admin session, its mail engine and its database, so we moved artifacts into the Next.js app: routes in the portfolio and data in its PostgreSQL database, served on `artifacts.inakilozano.com` by the same process, with files in a MinIO instance in the portfolio's compose project.

## Considered Options

- **Keep the separate process and bridge it**: a signed redirect handshake for the owner login and an internal token-protected endpoint for mail. Rejected because every new feature would need another bridge, and the owner asked for one repo and one database.
- **Separate process on the portfolio's PostgreSQL and MinIO**: keeps process isolation but still needs both bridges.

## Consequences

- Artifact HTML is untrusted code now served by the process that also holds the admin session. It must keep running only on the separate content origin (`artifacts-content.inakilozano.com`) inside a sandboxed iframe without `allow-same-origin`; serving it from the app origin would expose the admin session.
- The old server, its SQLite data and the duplicate keys-hub service are deleted; the one existing artifact is republished and API tokens are reissued.
- Artifact data has no backup job by the owner's decision.
