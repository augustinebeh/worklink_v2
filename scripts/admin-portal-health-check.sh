#!/bin/bash

# Admin Portal Health Check Script
# Quick validation of admin portal functionality after deployments

echo "🏥 Admin Portal Health Check"
echo "============================"
echo "Date: $(date)"
echo

# Configuration
ADMIN_URL="http://127.0.0.1:3002/admin"
API_URL="http://localhost:8080/api/v1"
TIMEOUT=10

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check URL accessibility
check_url() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}

    echo -n "  Testing $name... "

    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null)

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK ($status)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL ($status)${NC}"
        return 1
    fi
}

# Function to check if page contains errors
check_page_content() {
    local url=$1
    local name=$2

    echo -n "  Checking $name content... "

    content=$(curl -s --max-time $TIMEOUT "$url" 2>/dev/null)

    if echo "$content" | grep -q "<!DOCTYPE html>"; then
        if echo "$content" | grep -qi "error\|exception\|cannot\|failed"; then
            echo -e "${YELLOW}⚠️ WARN (contains error text)${NC}"
            return 1
        else
            echo -e "${GREEN}✅ OK${NC}"
            return 0
        fi
    else
        echo -e "${RED}❌ FAIL (not HTML)${NC}"
        return 1
    fi
}

# Track results
total_tests=0
passed_tests=0
failed_tests=0

run_test() {
    total_tests=$((total_tests + 1))
    if "$@"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
}

echo "1. Testing Admin Portal Accessibility"
echo "------------------------------------"

# Test main admin portal
run_test check_url "$ADMIN_URL/" "Admin Portal Home"
run_test check_page_content "$ADMIN_URL/" "Admin Portal Home"

# Test high priority pages
echo
echo "2. Testing High Priority Pages"
echo "-----------------------------"

high_priority_pages=(
    "/:Dashboard"
    "/jobs:Jobs"
    "/clients:Clients"
    "/candidates:Candidates"
)

for page_info in "${high_priority_pages[@]}"; do
    IFS=':' read -r path name <<< "$page_info"
    run_test check_url "$ADMIN_URL$path" "$name"
done

# Test medium priority pages
echo
echo "3. Testing Medium Priority Pages"
echo "--------------------------------"

medium_priority_pages=(
    "/financials:Financial Dashboard"
    "/chat:Chat"
    "/payments:Payments"
    "/deployments:Deployments"
)

for page_info in "${medium_priority_pages[@]}"; do
    IFS=':' read -r path name <<< "$page_info"
    run_test check_url "$ADMIN_URL$path" "$name"
done

# Test critical API endpoints
echo
echo "4. Testing Critical API Endpoints"
echo "--------------------------------"

critical_apis=(
    "/auth/validate:Auth Validation"
    "/admin/stats:Admin Stats"
    "/analytics/dashboard:Analytics Dashboard"
    "/candidates:Candidates API"
    "/jobs:Jobs API"
)

for api_info in "${critical_apis[@]}"; do
    IFS=':' read -r endpoint name <<< "$api_info"
    run_test check_url "$API_URL$endpoint" "$name"
done

# Test problematic pages (known to have issues)
echo
echo "5. Testing Known Problematic Pages"
echo "---------------------------------"

problematic_pages=(
    "/ml-dashboard:ML Dashboard"
    "/ai-automation:AI Automation"
    "/settings:Settings"
    "/consultant-performance:Consultant Performance"
)

echo -e "${YELLOW}ℹ️  These pages are known to have API migration issues:${NC}"
for page_info in "${problematic_pages[@]}"; do
    IFS=':' read -r path name <<< "$page_info"
    run_test check_url "$ADMIN_URL$path" "$name"
done

# Summary
echo
echo "📊 Health Check Summary"
echo "======================"
echo "Total Tests: $total_tests"
echo -e "Passed: ${GREEN}$passed_tests${NC}"
echo -e "Failed: ${RED}$failed_tests${NC}"

success_rate=$(( (passed_tests * 100) / total_tests ))
echo "Success Rate: $success_rate%"

echo
if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Admin portal is healthy.${NC}"
    exit 0
elif [ $success_rate -gt 80 ]; then
    echo -e "${YELLOW}⚠️  Most tests passed, but some issues detected.${NC}"
    exit 1
else
    echo -e "${RED}❌ Multiple failures detected. Admin portal needs attention.${NC}"
    exit 2
fi