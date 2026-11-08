#!/usr/bin/env bash
# Make nginx see the real visitor IP when the site is behind Cloudflare (fixes shared rate-limit bucket).
# Run ON THE SERVER as root.   Preview:  ./cloudflare-realip.sh      Apply:  ./cloudflare-realip.sh --apply
# Only Cloudflare's own ranges are trusted, so a request sent straight to the server IP cannot fake CF-Connecting-IP.
set -euo pipefail
OUT=/etc/nginx/conf.d/cloudflare-realip.conf
v4=$(curl -fsS https://www.cloudflare.com/ips-v4)
v6=$(curl -fsS https://www.cloudflare.com/ips-v6)
[ -n "$v4" ] && [ -n "$v6" ] || { echo "Could not download Cloudflare ranges" >&2; exit 1; }
conf="# Generated $(date -u +%F) by deploy/cloudflare-realip.sh. Refresh now and then (Cloudflare ranges rarely change).
$(printf '%s\n%s\n' "$v4" "$v6" | sed 's/^/set_real_ip_from /; s/$/;/')
real_ip_header CF-Connecting-IP;
real_ip_recursive off;"
if [ "${1:-}" != "--apply" ]; then echo "$conf"; echo; echo "(preview only; run with --apply to install)"; exit 0; fi
[ -f "$OUT" ] && cp "$OUT" "$OUT.bak.$(date +%s)"
printf '%s\n' "$conf" > "$OUT"
if nginx -t; then systemctl reload nginx && echo "OK: nginx reloaded"; else echo "nginx -t failed, restoring"; rm -f "$OUT"; exit 1; fi
