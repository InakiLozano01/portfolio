#!/usr/bin/env bash
# Nightly backup: consistent SQLite snapshot (VACUUM INTO) + content-addressed blobs, as one tarball.
# In-flight upload parts (uploads/) are skipped on purpose: an interrupted upload is resent, not restored.
# Usage: artifacts/backup.sh            BACKUP_ROOT defaults to ~/backups/artifacts, keeps 14 newest.
# Restore: stop the container, extract the tarball, move artifacts.db + blobs/ into ARTIFACTS_DATA_DIR, start.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${ARTIFACTS_DATA_DIR:=/home/ubuntu/vps/artifacts-data}"
: "${BACKUP_ROOT:=$HOME/backups/artifacts}"
: "${KEEP:=14}"
umask 077
mkdir -p "$BACKUP_ROOT"
stamp="$(date +%Y%m%d-%H%M%S)"
snap="backups/snapshot-$stamp.db"
docker compose -f "$here/compose.yml" exec -T artifacts node server.mjs backup "/data/$snap" >/dev/null
tar -C "$ARTIFACTS_DATA_DIR" -czf "$BACKUP_ROOT/artifacts-$stamp.tar.gz" \
  --transform "s|^$snap\$|artifacts.db|" "$snap" blobs
rm -f "$ARTIFACTS_DATA_DIR/$snap"
ls -1t "$BACKUP_ROOT"/artifacts-*.tar.gz | tail -n +"$((KEEP + 1))" | xargs -r rm -f
echo "$BACKUP_ROOT/artifacts-$stamp.tar.gz"
