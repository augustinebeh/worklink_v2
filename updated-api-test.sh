#!/bin/bash

# Updated Comprehensive API Testing Script for WorkLink v2

BASE_URL="http://localhost:8080"
API_BASE="$BASE_URL/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "WorkLink v2 API Comprehensive Test Suite"
echo "========================================="

# Get auth token
log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[PASS]${NC} $1"; }
failure() { echo -e "${RED}[FAIL]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

log "Getting authentication token..."

# Admin login with correct parameters
login_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"email":"admin@worklink.sg","password":"admin123","type":"admin"}' \
    "$API_BASE/auth/login")

echo "Login response: $login_response"

# Extract token
AUTH_TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\([^"]*\)"/\1/')

if [ -n "$AUTH_TOKEN" ]; then
    success "Got auth token: ${AUTH_TOKEN:0:20}..."
else
    failure "Failed to get auth token"
    exit 1
fi

echo ""
echo "=== HEALTH CHECK TESTING ==="

# 1. System Health Check
response=$(curl -s "$BASE_URL/health")
if echo "$response" | grep -q '"status":"ok"'; then
    success "System Health Check"
else
    failure "System Health Check"
fi
echo "Response: $response"

echo ""
echo "=== AUTHENTICATION MODULE TESTING ==="

# 2. Auth module health
response=$(curl -s "$API_BASE/auth/health")
echo "Auth Health Response: $response"

# 3. Auth module info
response=$(curl -s "$API_BASE/auth/")
echo "Auth Info Response: $response"

# 4. Profile endpoint with token
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/auth/me")
echo "Profile Response: $response"

echo ""
echo "=== REFACTORED MODULES TESTING ==="

log "Testing refactored modules..."

# Test Candidates Module
echo "--- CANDIDATES MODULE ---"
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/candidates")
echo "Candidates List Response: $response"

response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/candidates/health" || echo "Health endpoint may not exist")
echo "Candidates Health Response: $response"

# Test Chat Module
echo "--- CHAT MODULE ---"
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/chat")
echo "Chat List Response: $response"

# Test AI Automation
echo "--- AI AUTOMATION MODULE ---"
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/ai")
echo "AI Automation Response: $response"

# Test Smart Response Router
echo "--- SMART RESPONSE ROUTER MODULE ---"
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/smart-response-router")
echo "Smart Response Router Response: $response"

echo ""
echo "=== CORE API MODULES TESTING ==="

# Test Jobs
echo "--- JOBS MODULE ---"
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/jobs")
echo "Jobs Response: $response"

# Test Clients
echo "--- CLIENTS MODULE ---"
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/clients")
echo "Clients Response: $response"

# Test Analytics
echo "--- ANALYTICS MODULE ---"
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/analytics")
echo "Analytics Response: $response"

# Test Deployments
echo "--- DEPLOYMENTS MODULE ---"
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/deployments")
echo "Deployments Response: $response"

# Test Payments
echo "--- PAYMENTS MODULE ---"
response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/payments")
echo "Payments Response: $response"

echo ""
echo "=== CRUD OPERATIONS TESTING ==="

# Test candidate creation
log "Testing CRUD operations..."

echo "--- CREATE CANDIDATE ---"
create_response=$(curl -s -X POST -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test API User","email":"test-api@example.com","phone":"1234567890"}' \
    "$API_BASE/candidates")
echo "Create Candidate Response: $create_response"

# Extract candidate ID if successful
candidate_id=$(echo "$create_response" | grep -o '"id":"[^"]*"' | sed 's/"id":"\([^"]*\)"/\1/' | head -1)
if [ -n "$candidate_id" ]; then
    success "Created test candidate: $candidate_id"

    echo "--- READ CANDIDATE ---"
    read_response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/candidates/$candidate_id")
    echo "Read Candidate Response: $read_response"

    echo "--- UPDATE CANDIDATE ---"
    update_response=$(curl -s -X PUT -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Updated Test User","status":"active"}' \
        "$API_BASE/candidates/$candidate_id")
    echo "Update Candidate Response: $update_response"

else
    warning "Could not create test candidate for CRUD testing"
fi

echo ""
echo "=== ERROR HANDLING TESTING ==="

log "Testing error handling..."

# Test 404
response=$(curl -s -w "%{http_code}" "$API_BASE/nonexistent-endpoint" | tail -c 3)
if [ "$response" = "404" ]; then
    success "404 Error Handling"
else
    failure "404 Error Handling - Got: $response"
fi

# Test unauthorized access
response=$(curl -s -w "%{http_code}" "$API_BASE/auth/me" | tail -c 3)
if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    success "Unauthorized Access Handling"
else
    warning "Unauthorized Access Handling - Got: $response"
fi

# Test malformed JSON
response=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" \
    -d '{"invalid":json}' "$API_BASE/auth/login" | tail -c 3)
if [ "$response" = "400" ] || [ "$response" = "500" ]; then
    success "Malformed JSON Handling"
else
    warning "Malformed JSON Handling - Got: $response"
fi

echo ""
echo "=== INTEGRATION TESTING ==="

log "Testing integrations..."

# Test WebSocket endpoint
response=$(curl -s -I "$BASE_URL/ws" | head -1)
echo "WebSocket Response: $response"

# Test admin portal
response=$(curl -s -w "%{http_code}" "$BASE_URL/admin" | tail -c 3)
echo "Admin Portal Status: $response"

echo ""
echo "=== PERFORMANCE TESTING ==="

log "Testing performance..."

# Measure API response times
start_time=$(date +%s%N)
curl -s "$API_BASE/" > /dev/null
end_time=$(date +%s%N)
duration=$(( ($end_time - $start_time) / 1000000 ))
log "API Root Response Time: ${duration}ms"

start_time=$(date +%s%N)
curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/candidates" > /dev/null
end_time=$(date +%s%N)
duration=$(( ($end_time - $start_time) / 1000000 ))
log "Candidates API Response Time: ${duration}ms"

echo ""
echo "========================================="
echo "API Testing Complete"
echo "========================================="