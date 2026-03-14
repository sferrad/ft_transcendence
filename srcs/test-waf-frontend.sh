#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

check_code() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local code
  code=$(/usr/bin/curl -s -o /tmp/waf_test_body.txt -w '%{http_code}' "$url")
  if [[ "$code" == "$expected" ]]; then
    green "[OK] $label -> $code"
  else
    red "[KO] $label -> got $code expected $expected"
  fi
}

echo "== FRONTEND SANITY =="
check_code "Root" "$BASE_URL/" "200"
check_code "Vite client" "$BASE_URL/@vite/client" "200"
check_code "Main TSX" "$BASE_URL/src/main.tsx" "200"
check_code "Background image" "$BASE_URL/assets/bgHome.jpg" "200"
check_code "i18n" "$BASE_URL/locales/en/translation.json" "200"

echo
echo "== INJECTION / SECURITY =="
check_code "SQLi payload" "$BASE_URL/?id=1%27%20OR%201%3D1%20--" "403"
check_code "XSS payload" "$BASE_URL/?q=%3Cscript%3Ealert(1)%3C/script%3E" "403"
check_code "Hidden file" "$BASE_URL/.env" "404"
check_code "Traversal encoded" "$BASE_URL/%2e%2e/%2e%2e/etc/passwd" "400"

echo
echo "== API BURST (rate-limit expected) =="
rate_limited=0
for i in $(seq 1 20); do
  code=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/test")
  printf "%02d=%s " "$i" "$code"
  if [[ "$code" == "503" ]]; then
    rate_limited=1
  fi
done
echo
if [[ "$rate_limited" -eq 1 ]]; then
  green "[OK] Rate-limit observed (503 present)"
else
  red "[KO] No 503 observed in API burst"
fi

echo
echo "== SECURITY HEADERS =="
/usr/bin/curl -sI "$BASE_URL/" | /usr/bin/grep -Ei 'x-frame-options|x-content-type-options|x-xss-protection|referrer-policy|permissions-policy|content-security-policy' || true

echo
echo "Done."
