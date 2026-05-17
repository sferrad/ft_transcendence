#!/bin/sh
# Detect the correct DNS resolver IP from /etc/resolv.conf and patch nginx.conf.
# This handles both Docker (127.0.0.11) and Podman (10.89.x.1) networking.

RESOLVER_IP=$(grep '^nameserver' /etc/resolv.conf | head -1 | awk '{print $2}')
RESOLVER_IP="${RESOLVER_IP:-127.0.0.11}"

echo "[entrypoint] Setting nginx resolver to: $RESOLVER_IP"
sed -i "s|resolver 127\.0\.0\.11 |resolver ${RESOLVER_IP} |g" /etc/nginx/nginx.conf
