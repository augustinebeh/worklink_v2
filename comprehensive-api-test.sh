#!/bin/bash

# Comprehensive API Testing Script for WorkLink v2
# Tests all refactored modules and critical endpoints

BASE_URL="http://localhost:8080"
API_BASE="$BASE_URL/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
RESULTS_FILE="api-test-results.json"
echo "{" > $RESULTS_FILE

# Helper functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

failure() {
    echo -e "${RED}[FAIL]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test function
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local expected_status="${4:-200}"
    local data="$5"
    local auth_header="$6"

    log "Testing: $description"

    if [ -n "$data" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -H "Authorization: $auth_header" \
                -d "$data" "$endpoint" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" "$endpoint" 2>/dev/null)
        fi
    else
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Authorization: $auth_header" \
                "$endpoint" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                "$endpoint" 2>/dev/null)
        fi
    fi

    # Extract status code and body
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    # Check if status code matches expected
    if [ "$status_code" = "$expected_status" ]; then
        success "$description - Status: $status_code"
        echo "Response: $body" | head -c 200
        echo ""
        return 0
    else
        failure "$description - Expected: $expected_status, Got: $status_code"
        echo "Response: $body" | head -c 200
        echo ""
        return 1
    fi
}

# Get auth token for testing protected endpoints
get_auth_token() {
    log "Getting authentication token..."

    # Try to login as admin
    login_data='{"email":"admin@worklink.sg","password":"admin123"}'
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$login_data" "$API_BASE/auth/login" 2>/dev/null)

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$status_code" = "200" ]; then
        # Extract token from response (assuming JSON format)
        token=$(echo "$body" | grep -o '"token":"[^"]*"' | sed 's/"token":"\([^"]*\)"/\1/')
        if [ -n "$token" ]; then
            echo "Bearer $token"
            return 0
        fi
    fi

    warning "Could not obtain auth token. Some tests may fail."
    return 1
}

echo "========================================="
echo "WorkLink v2 API Comprehensive Test Suite"
echo "========================================="

# Get auth token
AUTH_TOKEN=$(get_auth_token)

echo ""
echo "=== HEALTH CHECK TESTING ==="

# 1. Health Check
test_endpoint "GET" "$BASE_URL/health" "Health Check Endpoint"

echo ""
echo "=== API ROOT TESTING ==="

# 2. API Root
test_endpoint "GET" "$API_BASE/" "API Root Information"

echo ""
echo "=== AUTHENTICATION MODULE TESTING ==="

# 3. Auth endpoints
test_endpoint "POST" "$API_BASE/auth/login" "Admin Login" "200" '{"email":"admin@worklink.sg","password":"admin123"}'
test_endpoint "POST" "$API_BASE/auth/login" "Invalid Login" "401" '{"email":"invalid@test.com","password":"wrong"}'
test_endpoint "GET" "$API_BASE/auth/profile" "Get Profile" "200" "" "$AUTH_TOKEN"
test_endpoint "GET" "$API_BASE/auth/verify" "Token Verification" "200" "" "$AUTH_TOKEN"

echo ""
echo "=== CANDIDATES MODULE TESTING ==="

# 4. Candidates endpoints
test_endpoint "GET" "$API_BASE/candidates" "List Candidates" "200" "" "$AUTH_TOKEN"
test_endpoint "GET" "$API_BASE/candidates/1" "Get Candidate by ID" "" "" "$AUTH_TOKEN"
test_endpoint "POST" "$API_BASE/candidates" "Create Candidate" "" '{"name":"Test User","email":"test@example.com","phone":"1234567890"}' "$AUTH_TOKEN"

echo ""
echo "=== CHAT MODULE TESTING ==="

# 5. Chat endpoints
test_endpoint "GET" "$API_BASE/chat" "List Conversations" "200" "" "$AUTH_TOKEN"
test_endpoint "GET" "$API_BASE/chat/messages" "List Messages" "" "" "$AUTH_TOKEN"

echo ""
echo "=== JOBS MODULE TESTING ==="

# 6. Jobs endpoints
test_endpoint "GET" "$API_BASE/jobs" "List Jobs" "200" "" "$AUTH_TOKEN"
test_endpoint "GET" "$API_BASE/jobs/1" "Get Job by ID" "" "" "$AUTH_TOKEN"

echo ""
echo "=== CLIENTS MODULE TESTING ==="

# 7. Clients endpoints
test_endpoint "GET" "$API_BASE/clients" "List Clients" "200" "" "$AUTH_TOKEN"

echo ""
echo "=== ANALYTICS MODULE TESTING ==="

# 8. Analytics endpoints
test_endpoint "GET" "$API_BASE/analytics" "Analytics Dashboard" "200" "" "$AUTH_TOKEN"
test_endpoint "GET" "$API_BASE/analytics/overview" "Analytics Overview" "" "" "$AUTH_TOKEN"

echo ""
echo "=== AI AUTOMATION MODULE TESTING ==="

# 9. AI Automation endpoints
test_endpoint "GET" "$API_BASE/ai" "AI Automation Health" "200" "" "$AUTH_TOKEN"

echo ""
echo "=== SMART RESPONSE ROUTER TESTING ==="

# 10. Smart Response Router endpoints
test_endpoint "GET" "$API_BASE/smart-response-router" "Smart Response Router" "" "" "$AUTH_TOKEN"

echo ""
echo "=== PAYMENTS MODULE TESTING ==="

# 11. Payments endpoints
test_endpoint "GET" "$API_BASE/payments" "List Payments" "200" "" "$AUTH_TOKEN"

echo ""
echo "=== DEPLOYMENTS MODULE TESTING ==="

# 12. Deployments endpoints
test_endpoint "GET" "$API_BASE/deployments" "List Deployments" "200" "" "$AUTH_TOKEN"

echo ""
echo "=== ERROR HANDLING TESTING ==="

# 13. Error handling
test_endpoint "GET" "$API_BASE/nonexistent" "404 Error Handling" "404"
test_endpoint "GET" "$API_BASE/auth/profile" "401 Unauthorized" "401"

echo ""
echo "=== PERFORMANCE TESTING ==="

log "Running performance tests..."
start_time=$(date +%s%N)
test_endpoint "GET" "$API_BASE/" "Performance - API Root"
end_time=$(date +%s%N)
duration=$(( ($end_time - $start_time) / 1000000 ))
log "Response time: ${duration}ms"

echo ""
echo "========================================="
echo "API Testing Complete"
echo "========================================="

echo "}" >> $RESULTS_FILE