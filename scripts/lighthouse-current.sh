#!/usr/bin/env bash
set -euo pipefail

IMAGE="${LIGHTHOUSE_IMAGE:-ghcr.io/puppeteer/puppeteer:latest}"
LIGHTHOUSE_VERSION="${LIGHTHOUSE_VERSION:-13.3.0}"
BASE_URL="${LIGHTHOUSE_BASE_URL:-http://127.0.0.1:3003}"
PROFILES="${LIGHTHOUSE_PROFILES:-desktop mobile}"
CPUS="${LIGHTHOUSE_CPUS:-1}"
MEMORY="${LIGHTHOUSE_MEMORY:-4096m}"
PULL_POLICY="${LIGHTHOUSE_PULL:-always}"
REPORT_DIR="${LIGHTHOUSE_REPORT_DIR:-/tmp/portfolio-lighthouse}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -eq 0 ]; then
  ROUTES=("/en" "/es")
else
  ROUTES=("$@")
fi

load_1m="$(awk '{print $1}' /proc/loadavg)"
if ! awk -v load_value="$load_1m" 'BEGIN { exit(load_value < 8 ? 0 : 1) }'; then
  echo "Refusing to start Lighthouse: host load ${load_1m} is >= 8." >&2
  exit 1
fi

mkdir -p "$REPORT_DIR"
chmod 0777 "$REPORT_DIR"

echo "Host load: $(uptime)"
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.PIDs}}' | sed -n '1,20p'

ROUTE_LIST="$(printf '%s\n' "${ROUTES[@]}")"

docker run \
  --pull="$PULL_POLICY" \
  --rm \
  --cpus="$CPUS" \
  --memory="$MEMORY" \
  --memory-swap="$MEMORY" \
  --pids-limit=256 \
  --network=host \
  --shm-size=1g \
  -e BASE_URL="$BASE_URL" \
  -e PROFILES="$PROFILES" \
  -e ROUTE_LIST="$ROUTE_LIST" \
  -e LIGHTHOUSE_VERSION="$LIGHTHOUSE_VERSION" \
  -v "$REPORT_DIR:/reports" \
  -v "$SCRIPT_DIR:/work/scripts:ro" \
  "$IMAGE" \
  sh -lc '
set -eu

chrome_path="$(find /home/pptruser/.cache/puppeteer -type f -path "*/chrome-linux*/chrome" | sort -V | tail -n 1)"
if [ -z "$chrome_path" ]; then
  echo "No Chrome-for-Testing binary found in ${IMAGE:-browser image}." >&2
  exit 1
fi

export CHROME_PATH="$chrome_path"
echo "Chrome: $("$CHROME_PATH" --version)"
echo "Lighthouse: $(npx -y "lighthouse@${LIGHTHOUSE_VERSION}" --version)"

sanitize() {
  printf "%s" "$1" | sed "s#^[a-zA-Z]*://##; s#[^A-Za-z0-9._-]#_#g"
}

printf "%s\n" "$ROUTE_LIST" | while IFS= read -r route; do
  [ -n "$route" ] || continue

  case "$route" in
    http://*|https://*) url="$route" ;;
    *) url="${BASE_URL%/}/${route#/}" ;;
  esac

  for profile in $PROFILES; do
    case "$profile" in
      desktop) preset="--preset=desktop" ;;
      mobile) preset="" ;;
      *)
        echo "Unsupported Lighthouse profile: $profile" >&2
        exit 1
        ;;
    esac

    report="/reports/$(sanitize "$url")_${profile}.json"
    echo "Auditing ${url} (${profile})"

    # Intentionally allow word splitting for the optional desktop preset.
    # shellcheck disable=SC2086
    npx -y "lighthouse@${LIGHTHOUSE_VERSION}" "$url" $preset \
      --chrome-flags="--headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-zygote" \
      --throttling-method=provided \
      --extra-headers="{\"x-forwarded-proto\":\"https\",\"x-forwarded-host\":\"inakilozano.com\"}" \
      --output=json \
      --output-path="$report" \
      --quiet

    node /work/scripts/lighthouse-summary.js "$report" "$url" "$profile"
  done
done
'
