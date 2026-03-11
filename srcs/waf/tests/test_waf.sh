#!/usr/bin/env bash
# =============================================================================
# WAF Integration Tests — ft_transcendence
#
# Validates that the WAF (Nginx + ModSecurity + OWASP CRS) correctly:
#   - Blocks common web attacks (XSS, SQLi, RCE, path traversal)
#   - Allows legitimate application traffic
#
# Usage:
#   WAF_URL=http://localhost ./test_waf.sh
#
# Requirements: curl
# =============================================================================

set -euo pipefail

WAF_URL="${WAF_URL:-http://localhost}"
PASS=0
FAIL=0

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo " ft_transcendence — WAF Integration Tests"
echo " Target: ${WAF_URL}"
echo "=============================================="

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

pass() {
    echo -e "  ${GREEN}[PASS]${NC} $1"
    PASS=$((PASS + 1))
}

fail() {
    echo -e "  ${RED}[FAIL]${NC} $1"
    echo -e "         Expected: $2"
    echo -e "         Got:      $3"
    FAIL=$((FAIL + 1))
}

# Expect HTTP 403 (blocked by WAF) or 400 (bad request rejected)
check_blocked() {
    local name="$1"
    local url="$2"
    shift 2
    local status
    status=$(curl -sk -o /dev/null -w "%{http_code}" "$@" "$url" 2>/dev/null || true)
    if [[ "$status" == "403" || "$status" == "400" ]]; then
        pass "${name} (HTTP ${status})"
    else
        fail "${name}" "403 or 400" "${status}"
    fi
}

# Expect HTTP status that is NOT 403/400 (request must reach the backend)
check_allowed() {
    local name="$1"
    local url="$2"
    shift 2
    local status
    status=$(curl -sk -o /dev/null -w "%{http_code}" "$@" "$url" 2>/dev/null || true)
    if [[ "$status" != "403" && "$status" != "400" ]]; then
        pass "${name} (HTTP ${status})"
    else
        fail "${name}" "not 403/400" "${status}"
    fi
}

# Wait for WAF to be reachable before running tests
wait_for_waf() {
    local retries=12
    local delay=5
    echo -e "${YELLOW}Waiting for WAF to become available...${NC}"
    for i in $(seq 1 "$retries"); do
        if curl -sk -o /dev/null -w "%{http_code}" "${WAF_URL}/waf-health" 2>/dev/null | grep -q "200"; then
            echo -e "  WAF is up."
            return 0
        fi
        echo "  Attempt ${i}/${retries} — retrying in ${delay}s..."
        sleep "$delay"
    done
    echo -e "${RED}WAF did not become available in time. Aborting.${NC}"
    exit 1
}

# =============================================================================
# TESTS
# =============================================================================

wait_for_waf

# -----------------------------------------------------------------------
echo ""
echo "--- WAF Health Check ---"
# -----------------------------------------------------------------------
status=$(curl -sk -o /dev/null -w "%{http_code}" "${WAF_URL}/waf-health" 2>/dev/null || true)
if [[ "$status" == "200" ]]; then
    pass "WAF health endpoint returns 200"
else
    fail "WAF health endpoint" "200" "$status"
fi

# -----------------------------------------------------------------------
echo ""
echo "--- XSS Attack Tests ---"
# -----------------------------------------------------------------------
check_blocked \
    "XSS: <script> tag in query param" \
    "${WAF_URL}/?q=%3Cscript%3Ealert%281%29%3C%2Fscript%3E"

check_blocked \
    "XSS: javascript: URI scheme" \
    "${WAF_URL}/?url=javascript%3Aalert%28document.cookie%29"

check_blocked \
    "XSS: onerror event handler" \
    "${WAF_URL}/?img=%3Cimg+onerror%3Dalert%281%29+src%3Dx%3E"

check_blocked \
    "XSS: POST body with script tag" \
    "${WAF_URL}/api/users" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"<script>alert(1)</script>"}'

# -----------------------------------------------------------------------
echo ""
echo "--- SQL Injection Tests ---"
# -----------------------------------------------------------------------
check_blocked \
    "SQLi: UNION SELECT in query param" \
    "${WAF_URL}/api/users?id=1+UNION+SELECT+1%2C2%2C3--"

check_blocked \
    "SQLi: OR 1=1 tautology" \
    "${WAF_URL}/api/users?username=admin%27+OR+%271%27%3D%271"

check_blocked \
    "SQLi: DROP TABLE statement" \
    "${WAF_URL}/api/users?id=1%3BDROP+TABLE+users--"

check_blocked \
    "SQLi: comment sequence --" \
    "${WAF_URL}/api/login?user=admin%27--"

# -----------------------------------------------------------------------
echo ""
echo "--- Remote Code Execution / Command Injection Tests ---"
# -----------------------------------------------------------------------
check_blocked \
    "RCE: shell command via semicolon" \
    "${WAF_URL}/api/?cmd=%3Bcat+%2Fetc%2Fpasswd"

check_blocked \
    "RCE: backtick command substitution" \
    "${WAF_URL}/api/?q=%60id%60"

# -----------------------------------------------------------------------
echo ""
echo "--- Path Traversal Tests ---"
# -----------------------------------------------------------------------
check_blocked \
    "Path traversal: ../../etc/passwd" \
    "${WAF_URL}/api/../../etc/passwd"

check_blocked \
    "Path traversal: URL-encoded ../" \
    "${WAF_URL}/api/..%2F..%2F..%2Fetc%2Fpasswd"

check_blocked \
    "Path traversal: double-encoded" \
    "${WAF_URL}/api/%2E%2E%2F%2E%2E%2Fetc%2Fpasswd"

# -----------------------------------------------------------------------
echo ""
echo "--- Legitimate Traffic (must NOT be blocked) ---"
# -----------------------------------------------------------------------
check_allowed \
    "Normal GET request to root" \
    "${WAF_URL}/"

check_allowed \
    "WAF health check endpoint" \
    "${WAF_URL}/waf-health"

check_allowed \
    "JSON API request with Accept header" \
    "${WAF_URL}/api/" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json"

check_allowed \
    "POST with valid JSON body" \
    "${WAF_URL}/api/users" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"alice","email":"alice@example.com","password":"SecureP@ss1"}'

check_allowed \
    "Authorization header with JWT token" \
    "${WAF_URL}/api/profile" \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

check_allowed \
    "OPTIONS preflight request (CORS)" \
    "${WAF_URL}/api/users" \
    -X OPTIONS \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST"

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "=============================================="
printf " Results: ${GREEN}%d passed${NC}, ${RED}%d failed${NC}\n" "$PASS" "$FAIL"
echo "=============================================="

if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi
exit 0
