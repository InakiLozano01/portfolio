#!/bin/sh
# Applies docs/artifacts-nginx.patch to a COPY of the live nginx config and proves it in a throwaway nginx:
# nginx -t passes, both hosts reach the app on 3003 with noindex, a forged CF-Connecting-IP from a non-Cloudflare
# peer never reaches the upstream, and limit_req keys on the visitor behind Cloudflare, not on the edge.
# Usage: sh scripts/artifacts-nginx-check.sh [/home/ubuntu/vps/nginx]   (reads the live files, never writes them)
set -eu
LIVE=${1:-/home/ubuntu/vps/nginx}
REPO=$(cd "$(dirname "$0")/.." && pwd)
IMAGE=$(sed -n 's/^ *image: *//p' "$LIVE/docker-compose.yml" | head -1)
NODE_IMAGE=${NODE_IMAGE:-fleet-security/xtractor-app:20261021-node26}  # any image with node, runs the echo upstream
PORT=${PORT:-55640}
NET=artifacts-nginx-check SUBNET=${SUBNET:-10.250.240}
T=$(mktemp -d)
cleanup() { docker rm -f anc-nginx anc-echo >/dev/null 2>&1 || true; docker network rm $NET >/dev/null 2>&1 || true; rm -rf "$T"; }
trap cleanup EXIT
fail() { echo "FAIL: $*"; exit 1; }

mkdir -p "$T/nginx" "$T/le"
cp "$LIVE/nginx.conf" "$T/nginx/nginx.conf"
(cd "$T" && patch -s -p1 < "$REPO/docs/artifacts-nginx.patch")
grep -q 3480 "$T/nginx/nginx.conf" && fail "the old artifacts upstream 3480 is still referenced"
# Dummy certificates for every certificate path the config names.
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$T/k.pem" -out "$T/c.pem" -days 1 -subj /CN=check 2>/dev/null
for n in $(grep -ohE '/etc/letsencrypt/live/[^/]+' "$T/nginx/nginx.conf" | sort -u | xargs -n1 basename); do
  mkdir -p "$T/le/live/$n"; cp "$T/c.pem" "$T/le/live/$n/fullchain.pem"; cp "$T/k.pem" "$T/le/live/$n/privkey.pem"
done
# The live Cloudflare ranges plus one container address standing in for a Cloudflare edge.
{ echo "set_real_ip_from $SUBNET.10/32;"; cat "$LIVE/cloudflare-realip.conf"; } > "$T/realip.conf"
chmod -R a+rX "$T"
echo 'require("http").createServer((q,s)=>s.end(JSON.stringify({host:q.headers.host,cf:q.headers["cf-connecting-ip"]??null}))).listen(3003,"127.0.0.1")' > "$T/echo.js"

docker network create --subnet "$SUBNET.0/24" $NET >/dev/null
docker run -d --name anc-nginx --network $NET --ip "$SUBNET.2" -p "127.0.0.1:$PORT:443" --memory 128m --cpus 0.3 \
  -v "$T/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" -v "$T/realip.conf:/etc/nginx/conf.d/cloudflare-realip.conf:ro" \
  -v "$T/le:/etc/letsencrypt:ro" "$IMAGE" >/dev/null
docker run -d --name anc-echo --network container:anc-nginx --memory 64m -v "$T/echo.js:/echo.js:ro" --entrypoint node "$NODE_IMAGE" /echo.js >/dev/null
sleep 2
docker exec anc-nginx nginx -t 2>&1 | grep -q 'test is successful' || fail "nginx -t"
echo "ok nginx -t"

C="curl -sk --resolve artifacts.inakilozano.com:$PORT:127.0.0.1 --resolve artifacts-content.inakilozano.com:$PORT:127.0.0.1"
for h in artifacts artifacts-content; do
  out=$($C -D "$T/h" -H 'CF-Connecting-IP: 1.2.3.4' "https://$h.inakilozano.com:$PORT/x")
  echo "$out" | grep -q "\"host\":\"$h.inakilozano.com\"" || fail "$h did not reach the app: $out"
  echo "$out" | grep -q '1.2.3.4' && fail "$h forwarded a forged CF-Connecting-IP: $out"
  grep -qi '^x-robots-tag: noindex' "$T/h" || fail "$h has no noindex header"
  echo "ok $h -> 3003, noindex, forged CF-Connecting-IP replaced ($out)"
done

edge() { docker run --rm --network $NET --ip "$SUBNET.10" --entrypoint sh "$IMAGE" -c "$1"; }
out=$(edge "curl -sk -H 'Host: artifacts.inakilozano.com' -H 'CF-Connecting-IP: 203.0.113.7' https://$SUBNET.2/x")
echo "$out" | grep -q '"cf":"203.0.113.7"' || fail "visitor IP behind the edge not restored: $out"
echo "ok visitor IP behind a Cloudflare edge reaches the app ($out)"
codes=$(edge "for i in 1 2 3 4 5 6 7 8 9 10; do curl -sk -o /dev/null -w '%{http_code} ' -X POST -H 'Host: artifacts.inakilozano.com' -H 'CF-Connecting-IP: 203.0.113.7' https://$SUBNET.2/api/session; done
  echo '|'; curl -sk -o /dev/null -w '%{http_code}' -X POST -H 'Host: artifacts.inakilozano.com' -H 'CF-Connecting-IP: 203.0.113.8' https://$SUBNET.2/api/session")
echo "$codes" | grep -q 429 || fail "auth_limit never triggered: $codes"
[ "$(echo "${codes##*|}" | tr -d '\n ')" = 200 ] || fail "a second visitor behind the same edge was limited: $codes"
echo "ok auth_limit keys on the visitor, not the edge ($(echo $codes))"
echo PASS
