#!/bin/bash

# 🧪 COMPREHENSIVE INTEGRATION TEST RUNNER
# Executes all integration tests with proper environment setup

set -e

echo "🧪 WorkLink v2 Integration Test Suite"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test environment setup
TEST_DB_PATH="database/test_gebiz_intelligence.db"
SERVER_PORT=3000
TEST_TIMEOUT=30000

echo -e "${BLUE}🔧 Setting up test environment...${NC}"

# Clean up any existing test databases
if [ -f "$TEST_DB_PATH" ]; then
  rm "$TEST_DB_PATH"
  echo "Cleaned up existing test database"
fi

# Install test dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Install integration test dependencies
cd tests/integration
if [ ! -d "node_modules" ]; then
  echo "Installing integration test dependencies..."
  npm install
fi

echo -e "${GREEN}✅ Environment setup complete${NC}"
echo ""

# Function to run test suite
run_test_suite() {
  local suite_name=$1
  local test_pattern=$2
  local description=$3

  echo -e "${BLUE}🧪 Running $suite_name Tests${NC}"
  echo "Description: $description"
  echo "Pattern: $test_pattern"
  echo "----------------------------------------"

  start_time=$(date +%s)

  if npm test -- --testPathPattern="$test_pattern" --verbose; then
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    echo -e "${GREEN}✅ $suite_name tests passed ($duration seconds)${NC}"
    return 0
  else
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    echo -e "${RED}❌ $suite_name tests failed ($duration seconds)${NC}"
    return 1
  fi
}

# Track test results
declare -A test_results
total_tests=0
passed_tests=0

echo -e "${YELLOW}📋 Test Execution Plan:${NC}"
echo "1. End-to-End Scenario Tests (3 scenarios)"
echo "2. API Integration Tests (RSS, Lifecycle, Alerts)"
echo "3. Frontend Component Tests (AlertBell, TenderLifecycle)"
echo ""

# === END-TO-END TESTS ===
echo -e "${BLUE}🚀 PHASE 1: End-to-End Scenario Tests${NC}"
echo "Testing complete business workflows from trigger to resolution"
echo ""

# E2E Test 1: Tender Discovery Flow
((total_tests++))
if run_test_suite "E2E: Tender Discovery" "e2e/tender-discovery-flow" "New tender discovered → Alert sent → Bid manager reviews → Go decision"; then
  ((passed_tests++))
  test_results["e2e_tender_discovery"]="PASS"
else
  test_results["e2e_tender_discovery"]="FAIL"
fi
echo ""

# E2E Test 2: Renewal Prediction Flow
((total_tests++))
if run_test_suite "E2E: Renewal Prediction" "e2e/renewal-prediction-flow" "Renewal predicted → BD manager engages → Activities logged → RFP published"; then
  ((passed_tests++))
  test_results["e2e_renewal_prediction"]="PASS"
else
  test_results["e2e_renewal_prediction"]="FAIL"
fi
echo ""

# E2E Test 3: Critical Alert Escalation
((total_tests++))
if run_test_suite "E2E: Alert Escalation" "e2e/critical-alert-escalation" "Critical alert → Escalation after 1 hour → Director notified"; then
  ((passed_tests++))
  test_results["e2e_alert_escalation"]="PASS"
else
  test_results["e2e_alert_escalation"]="FAIL"
fi
echo ""

# === API INTEGRATION TESTS ===
echo -e "${BLUE}🔌 PHASE 2: API Integration Tests${NC}"
echo "Testing backend services and API endpoints"
echo ""

# API Test 1: RSS Scraper
((total_tests++))
if run_test_suite "API: RSS Scraper" "api/rss-scraper" "RSS feed parsing and tender creation from external sources"; then
  ((passed_tests++))
  test_results["api_rss_scraper"]="PASS"
else
  test_results["api_rss_scraper"]="FAIL"
fi
echo ""

# API Test 2: BPO Lifecycle
((total_tests++))
if run_test_suite "API: BPO Lifecycle" "api/bpo-lifecycle" "Complete tender lifecycle management API"; then
  ((passed_tests++))
  test_results["api_bpo_lifecycle"]="PASS"
else
  test_results["api_bpo_lifecycle"]="FAIL"
fi
echo ""

# API Test 3: Alert System
((total_tests++))
if run_test_suite "API: Alert System" "api/alert-system" "Alert rules, triggers, notifications, and escalations"; then
  ((passed_tests++))
  test_results["api_alert_system"]="PASS"
else
  test_results["api_alert_system"]="FAIL"
fi
echo ""

# === FRONTEND INTEGRATION TESTS ===
echo -e "${BLUE}🎨 PHASE 3: Frontend Integration Tests${NC}"
echo "Testing React components with real API interactions"
echo ""

# Frontend Test 1: AlertBell Component
((total_tests++))
if run_test_suite "Frontend: AlertBell" "frontend/alert-bell" "Alert notification bell component with API integration"; then
  ((passed_tests++))
  test_results["frontend_alert_bell"]="PASS"
else
  test_results["frontend_alert_bell"]="FAIL"
fi
echo ""

# Frontend Test 2: Tender Lifecycle Components
((total_tests++))
if run_test_suite "Frontend: Tender Lifecycle" "frontend/tender-lifecycle" "Tender management interface components"; then
  ((passed_tests++))
  test_results["frontend_tender_lifecycle"]="PASS"
else
  test_results["frontend_tender_lifecycle"]="FAIL"
fi
echo ""

# === TEST SUMMARY ===
cd ../..  # Return to project root

echo ""
echo "========================================"
echo -e "${BLUE}📊 INTEGRATION TEST SUMMARY${NC}"
echo "========================================"

echo -e "Total Test Suites: $total_tests"
echo -e "Passed: ${GREEN}$passed_tests${NC}"
echo -e "Failed: ${RED}$((total_tests - passed_tests))${NC}"

if [ $passed_tests -eq $total_tests ]; then
  echo -e "Success Rate: ${GREEN}100%${NC}"
  overall_result="PASS"
else
  success_rate=$((passed_tests * 100 / total_tests))
  echo -e "Success Rate: ${YELLOW}${success_rate}%${NC}"
  overall_result="PARTIAL"
fi

echo ""
echo "Detailed Results:"
echo "----------------"

# End-to-End Tests
echo -e "${BLUE}End-to-End Scenarios:${NC}"
echo -e "  Tender Discovery Flow:     ${test_results[e2e_tender_discovery]}"
echo -e "  Renewal Prediction Flow:   ${test_results[e2e_renewal_prediction]}"
echo -e "  Critical Alert Escalation: ${test_results[e2e_alert_escalation]}"

echo ""
echo -e "${BLUE}API Integration Tests:${NC}"
echo -e "  RSS Scraper:               ${test_results[api_rss_scraper]}"
echo -e "  BPO Lifecycle:             ${test_results[api_bpo_lifecycle]}"
echo -e "  Alert System:              ${test_results[api_alert_system]}"

echo ""
echo -e "${BLUE}Frontend Components:${NC}"
echo -e "  AlertBell Component:       ${test_results[frontend_alert_bell]}"
echo -e "  Tender Lifecycle:          ${test_results[frontend_tender_lifecycle]}"

echo ""

# Generate test report
echo -e "${BLUE}📋 Generating Test Report...${NC}"

cat > integration_test_report.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "overall_result": "$overall_result",
  "total_suites": $total_tests,
  "passed_suites": $passed_tests,
  "failed_suites": $((total_tests - passed_tests)),
  "success_rate": $((passed_tests * 100 / total_tests)),
  "test_results": {
    "e2e_tests": {
      "tender_discovery": "${test_results[e2e_tender_discovery]}",
      "renewal_prediction": "${test_results[e2e_renewal_prediction]}",
      "alert_escalation": "${test_results[e2e_alert_escalation]}"
    },
    "api_tests": {
      "rss_scraper": "${test_results[api_rss_scraper]}",
      "bpo_lifecycle": "${test_results[api_bpo_lifecycle]}",
      "alert_system": "${test_results[api_alert_system]}"
    },
    "frontend_tests": {
      "alert_bell": "${test_results[frontend_alert_bell]}",
      "tender_lifecycle": "${test_results[frontend_tender_lifecycle]}"
    }
  },
  "environment": {
    "node_version": "$(node --version)",
    "npm_version": "$(npm --version)",
    "test_timeout": $TEST_TIMEOUT,
    "database_path": "$TEST_DB_PATH"
  }
}
EOF

echo "Test report saved to: integration_test_report.json"

# Final status
echo ""
if [ $overall_result = "PASS" ]; then
  echo -e "${GREEN}🎉 ALL INTEGRATION TESTS PASSED!${NC}"
  echo -e "${GREEN}The system is ready for deployment.${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  SOME TESTS FAILED${NC}"
  echo -e "${YELLOW}Please review failed tests before deployment.${NC}"
  exit 1
fi