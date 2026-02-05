#!/bin/bash

# Quick Integration Test Script
# Tests all integrated components and API endpoints

echo "========================================="
echo "🚀 WORKLINK V2 - INTEGRATION TEST"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "1. Checking backend server..."
if curl -s http://localhost:8080/api/v1/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on port 8080${NC}"
else
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo "   Start with: cd /home/augustine/Augustine_Projects/worklink_v2 && npm start"
    exit 1
fi

echo ""

# Check if frontend is running
echo "2. Checking frontend server..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on port 5173${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend is NOT running${NC}"
    echo "   Start with: cd /home/augustine/Augustine_Projects/worklink_v2/admin && npm run dev"
fi

echo ""

# Test Renewal API
echo "3. Testing Renewal API..."
RENEWAL_RESPONSE=$(curl -s http://localhost:8080/api/v1/gebiz/renewals)
if echo "$RENEWAL_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Renewal API responding${NC}"
else
    echo -e "${RED}❌ Renewal API failed${NC}"
fi

echo ""

# Test Alert API
echo "4. Testing Alert API..."
ALERT_RESPONSE=$(curl -s http://localhost:8080/api/v1/alerts/unread-count)
if echo "$ALERT_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Alert API responding${NC}"
else
    echo -e "${RED}❌ Alert API failed${NC}"
fi

echo ""

# Test Lifecycle API
echo "5. Testing Lifecycle API..."
LIFECYCLE_RESPONSE=$(curl -s http://localhost:8080/api/v1/bpo/lifecycle)
if echo "$LIFECYCLE_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Lifecycle API responding${NC}"
else
    echo -e "${RED}❌ Lifecycle API failed${NC}"
fi

echo ""

# Check component files
echo "6. Checking component files..."
FILES=(
    "admin/src/components/bpo/RenewalTimeline.jsx"
    "admin/src/components/bpo/AlertBell.jsx"
    "admin/src/components/bpo/LifecyclePipeline.jsx"
    "admin/src/components/bpo/index.js"
    "admin/src/shared/services/api/renewal.service.js"
    "admin/src/shared/services/api/alert.service.js"
    "admin/src/shared/services/api/lifecycle.service.js"
)

ALL_FILES_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $file"
    else
        echo -e "${RED}❌${NC} $file (MISSING)"
        ALL_FILES_EXIST=false
    fi
done

echo ""

# Summary
echo "========================================="
echo "📊 TEST SUMMARY"
echo "========================================="

if $ALL_FILES_EXIST; then
    echo -e "${GREEN}✅ All component files present${NC}"
else
    echo -e "${RED}❌ Some files are missing${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Navigate to 'GeBIZ Intelligence' → 'Renewals' tab"
echo "3. Navigate to 'BPO Tender Lifecycle'"
echo "4. Check alert bell in header (top right)"
echo ""
echo "Full testing guide: See INTEGRATION_COMPLETE.md"
echo ""
echo "========================================="
