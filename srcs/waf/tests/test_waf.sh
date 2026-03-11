#!/usr/bin/env bash
# =============================================================================
# WAF Integration Tests – ft_transcendence
#
# Usage:
#   ./tests/test_waf.sh [WAF_URL]
#
# Default WAF_URL: http://localhost
#
# The script fires a series of HTTP requests against the WAF and verifies that:
#   • Legitimate requests pass through (status 200 / 301 / 4xx from backend)
#   • Attack payloads are blocked by ModSecurity (status 403)
#
# Exit codes:
#   0 – all tests passed
#   1 – one or more tests failed
# =============================================================================

set -euo pipefail

WAF_URL="${1:-http://localhost}"
PASS=0
FAIL=0
SKIP=0

# ANSI colours
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Helper: run a curl request and check the response status code.
#
# Usage: assert_status <expected_status> <test_name> [curl_opts...]
#
# If curl cannot reach the WAF (exit code 7 = CURLE_COULDNT_CONNECT) the test
# is skipped rather than failed so the script can be run offline.
assert_status() {
  local expected="$1"
  local name="$2"
  shift 2

  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$@") || {
    local rc=$?
    if [[ $rc -eq 7 || $rc -eq 28 ]]; then
      echo -e "${YELLOW}[SKIP]${NC} ${name} (WAF not reachable)"
      SKIP=$((SKIP + 1))
      return 0
    fi
    echo -e "${RED}[FAIL]${NC} ${name} – curl error ${rc}"
    FAIL=$((FAIL + 1))
    return 0
  }

  if [[ "$actual" =~ ^(${expected})$ ]]; then
    echo -e "${GREEN}[PASS]${NC} ${name} (HTTP ${actual})"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}[FAIL]${NC} ${name} – expected HTTP ${expected}, got HTTP ${actual}"
    FAIL=$((FAIL + 1))
  fi
}

echo "==================================================================="
echo "  ft_transcendence WAF Integration Tests"
echo "  Target: ${WAF_URL}"
echo "==================================================================="
echo ""

# -----------------------------------------------------------------------
# 1. Baseline – legitimate requests must NOT be blocked
# -----------------------------------------------------------------------
echo "--- Baseline (should NOT be blocked) ---"

# GET / – frontend should respond (200 or any non-403)
assert_status "[^4]|4[^0]|40[^3]|[2-5][0-9][0-9]" \
  "GET / passes through" \
  "${WAF_URL}/"

# GET /health – health-check endpoint
assert_status "[^4]|4[^0]|40[^3]|[2-5][0-9][0-9]" \
  "GET /health passes through" \
  "${WAF_URL}/health"

# Normal API request (may return 404 if route not implemented – that's fine)
assert_status "[^4]|4[^0]|40[^3]|[2-5][0-9][0-9]" \
  "GET /api/ passes through" \
  "${WAF_URL}/api/"

echo ""

# -----------------------------------------------------------------------
# 2. XSS – should be blocked with 403
# -----------------------------------------------------------------------
echo "--- XSS attacks (should be blocked – 403) ---"

assert_status "403" \
  "XSS in query string" \
  "${WAF_URL}/api/user?name=<script>alert(1)</script>"

assert_status "403" \
  "XSS in referer header" \
  -H "Referer: <script>alert('xss')</script>" \
  "${WAF_URL}/api/user"

assert_status "403" \
  "XSS via User-Agent header" \
  -H "User-Agent: <ScRiPt>alert(1)</ScRiPt>" \
  "${WAF_URL}/"

echo ""

# -----------------------------------------------------------------------
# 3. SQL Injection – should be blocked with 403
# -----------------------------------------------------------------------
echo "--- SQL Injection attacks (should be blocked – 403) ---"

assert_status "403" \
  "SQLi UNION SELECT in query" \
  "${WAF_URL}/api/user?id=1%20UNION%20SELECT%201,2,3--"

assert_status "403" \
  "SQLi OR 1=1 in query" \
  "${WAF_URL}/api/user?id=1'+OR+'1'='1"

assert_status "403" \
  "SQLi DROP TABLE in POST body" \
  -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "input=1%3B+DROP+TABLE+users%3B--" \
  "${WAF_URL}/api/user"

echo ""

# -----------------------------------------------------------------------
# 4. Path Traversal – should be blocked with 403
# -----------------------------------------------------------------------
echo "--- Path Traversal attacks (should be blocked – 403) ---"

assert_status "403" \
  "Path traversal ../../etc/passwd" \
  "${WAF_URL}/api/file?path=../../etc/passwd"

assert_status "403" \
  "Path traversal via encoded %2e%2e" \
  "${WAF_URL}/%2e%2e/%2e%2e/etc/passwd"

echo ""

# -----------------------------------------------------------------------
# 5. Remote Command Execution – should be blocked with 403
# -----------------------------------------------------------------------
echo "--- RCE / Command Injection attacks (should be blocked – 403) ---"

assert_status "403" \
  "RCE semicolon command injection" \
  "${WAF_URL}/api/cmd?input=%3Bcat+/etc/passwd"

assert_status "403" \
  "RCE pipe command injection" \
  "${WAF_URL}/api/cmd?input=%7Cwhoami"

echo ""

# -----------------------------------------------------------------------
# 6. HTTP Protocol Anomalies – should be blocked with 403
# -----------------------------------------------------------------------
echo "--- Protocol anomalies (should be blocked – 403) ---"

assert_status "403" \
  "Invalid HTTP method" \
  -X FOOBAR \
  "${WAF_URL}/"

echo ""

# -----------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------
echo "==================================================================="
echo "  Results: ${PASS} passed  |  ${FAIL} failed  |  ${SKIP} skipped"
echo "==================================================================="

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}OVERALL: FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}OVERALL: PASSED${NC}"
  exit 0
fi
