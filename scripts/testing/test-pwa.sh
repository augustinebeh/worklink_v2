#!/bin/bash

# PWA Testing Script for WorkLink v2
# Run this script to perform automated PWA checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNINGS=0

echo "=========================================="
echo "    WorkLink v2 PWA Testing Script"
echo "=========================================="
echo ""

# Function to print test result
print_result() {
  local status=$1
  local message=$2

  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✓${NC} $message"
    ((PASSED++))
  elif [ "$status" = "FAIL" ]; then
    echo -e "${RED}✗${NC} $message"
    ((FAILED++))
  elif [ "$status" = "WARN" ]; then
    echo -e "${YELLOW}⚠${NC} $message"
    ((WARNINGS++))
  else
    echo -e "${BLUE}ℹ${NC} $message"
  fi
}

# Change to worker directory
cd "$(dirname "$0")/worker" || exit 1

echo "📁 Working Directory: $(pwd)"
echo ""

# ============================================
# 1. FILE EXISTENCE CHECKS
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  FILE EXISTENCE CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check service worker
if [ -f "public/sw.js" ]; then
  print_result "PASS" "Service worker file exists (public/sw.js)"
else
  print_result "FAIL" "Service worker file missing (public/sw.js)"
fi

# Check manifest
if [ -f "public/manifest.json" ]; then
  print_result "PASS" "PWA manifest exists (public/manifest.json)"
else
  print_result "FAIL" "PWA manifest missing (public/manifest.json)"
fi

# Check icons
ICON_COUNT=$(find public -name "icon-*.png" 2>/dev/null | wc -l)
if [ "$ICON_COUNT" -ge 8 ]; then
  print_result "PASS" "PWA icons found ($ICON_COUNT icons)"
else
  print_result "WARN" "Insufficient PWA icons ($ICON_COUNT found, need 8+)"
fi

# Check splash screens
if [ -d "public/splash" ]; then
  SPLASH_COUNT=$(find public/splash -name "*.png" 2>/dev/null | wc -l)
  if [ "$SPLASH_COUNT" -ge 10 ]; then
    print_result "PASS" "iOS splash screens found ($SPLASH_COUNT screens)"
  else
    print_result "WARN" "Limited splash screens ($SPLASH_COUNT found)"
  fi
else
  print_result "WARN" "No splash screen directory"
fi

# Check InstallPrompt component
if [ -f "src/components/InstallPrompt.jsx" ]; then
  print_result "PASS" "InstallPrompt component exists"
else
  print_result "FAIL" "InstallPrompt component missing"
fi

echo ""

# ============================================
# 2. CONFIGURATION CHECKS
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  CONFIGURATION CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if vite-plugin-pwa is configured
if grep -q "VitePWA" vite.config.js 2>/dev/null; then
  print_result "PASS" "Vite PWA plugin is configured"
elif grep -q "vite-plugin-pwa" package.json 2>/dev/null; then
  print_result "FAIL" "Vite PWA plugin in package.json but NOT configured in vite.config.js"
else
  print_result "PASS" "Using manual service worker (no plugin)"
fi

# Check viewport meta tag
if grep -q "viewport-fit=cover" index.html 2>/dev/null; then
  print_result "PASS" "Viewport configured for safe areas"
else
  print_result "WARN" "viewport-fit=cover not found in index.html"
fi

# Check theme-color meta tag
if grep -q 'name="theme-color"' index.html 2>/dev/null; then
  print_result "PASS" "Theme color meta tag found"
else
  print_result "WARN" "Theme color meta tag missing"
fi

# Check apple-mobile-web-app-capable
if grep -q 'name="apple-mobile-web-app-capable"' index.html 2>/dev/null; then
  print_result "PASS" "iOS web app capable meta tag found"
else
  print_result "WARN" "iOS web app capable meta tag missing"
fi

echo ""

# ============================================
# 3. CODE QUALITY CHECKS
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  CODE QUALITY CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check service worker registration
if grep -q "serviceWorker.register" src/main.jsx 2>/dev/null; then
  print_result "PASS" "Service worker registration found in main.jsx"
else
  print_result "FAIL" "Service worker registration missing in main.jsx"
fi

# Check haptic feedback implementation
if [ -f "src/hooks/useHaptic.js" ]; then
  print_result "PASS" "Haptic feedback hook exists"
else
  print_result "WARN" "Haptic feedback hook missing"
fi

# Check ErrorBoundary
if [ -f "src/components/ErrorBoundary.jsx" ]; then
  print_result "PASS" "ErrorBoundary component exists"
else
  print_result "WARN" "ErrorBoundary component missing"
fi

# Check safe area handling in CSS
if grep -q "safe-area-inset" src/index.css 2>/dev/null; then
  print_result "PASS" "Safe area insets in CSS"
else
  print_result "WARN" "Safe area insets not found in CSS"
fi

# Check if Web Share API is used
if grep -rq "navigator.share" src/ 2>/dev/null; then
  print_result "PASS" "Web Share API implementation found"
else
  print_result "WARN" "Web Share API not used"
fi

# Check if Clipboard API is used
if grep -rq "navigator.clipboard" src/ 2>/dev/null; then
  print_result "PASS" "Clipboard API implementation found"
else
  print_result "WARN" "Clipboard API not used"
fi

echo ""

# ============================================
# 4. DEPENDENCY CHECKS
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  DEPENDENCY CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
  print_result "PASS" "Dependencies installed"

  # Check critical dependencies
  if [ -d "node_modules/react" ]; then
    print_result "PASS" "React installed"
  else
    print_result "FAIL" "React not installed"
  fi

  if [ -d "node_modules/react-router-dom" ]; then
    print_result "PASS" "React Router installed"
  else
    print_result "FAIL" "React Router not installed"
  fi

  if [ -d "node_modules/lucide-react" ]; then
    print_result "PASS" "Lucide icons installed"
  else
    print_result "WARN" "Lucide icons not installed"
  fi

  if [ -d "node_modules/framer-motion" ]; then
    print_result "PASS" "Framer Motion installed"
  else
    print_result "WARN" "Framer Motion not installed"
  fi
else
  print_result "FAIL" "Dependencies not installed. Run: npm install"
fi

echo ""

# ============================================
# 5. BUILD CHECKS
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  BUILD CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d "dist" ]; then
  print_result "PASS" "Build directory exists"

  # Check build size
  BUILD_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
  print_result "INFO" "Build size: $BUILD_SIZE"

  # Check if service worker is in dist
  if [ -f "dist/sw.js" ]; then
    print_result "PASS" "Service worker in build output"
  else
    print_result "WARN" "Service worker missing from build output"
  fi

  # Check if manifest is in dist
  if [ -f "dist/manifest.json" ]; then
    print_result "PASS" "Manifest in build output"
  else
    print_result "WARN" "Manifest missing from build output"
  fi

  # Check if icons are in dist
  DIST_ICONS=$(find dist -name "icon-*.png" 2>/dev/null | wc -l)
  if [ "$DIST_ICONS" -ge 8 ]; then
    print_result "PASS" "Icons in build output ($DIST_ICONS icons)"
  else
    print_result "WARN" "Icons missing from build output"
  fi
else
  print_result "INFO" "No build directory. Run: npm run build"
fi

echo ""

# ============================================
# 6. MANIFEST VALIDATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  MANIFEST VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "public/manifest.json" ]; then
  # Check if manifest is valid JSON
  if python3 -m json.tool public/manifest.json > /dev/null 2>&1; then
    print_result "PASS" "Manifest is valid JSON"

    # Check required fields
    if grep -q '"name"' public/manifest.json; then
      print_result "PASS" "Manifest has 'name' field"
    else
      print_result "FAIL" "Manifest missing 'name' field"
    fi

    if grep -q '"short_name"' public/manifest.json; then
      print_result "PASS" "Manifest has 'short_name' field"
    else
      print_result "WARN" "Manifest missing 'short_name' field"
    fi

    if grep -q '"start_url"' public/manifest.json; then
      print_result "PASS" "Manifest has 'start_url' field"
    else
      print_result "FAIL" "Manifest missing 'start_url' field"
    fi

    if grep -q '"display"' public/manifest.json; then
      print_result "PASS" "Manifest has 'display' field"
    else
      print_result "FAIL" "Manifest missing 'display' field"
    fi

    if grep -q '"icons"' public/manifest.json; then
      print_result "PASS" "Manifest has 'icons' field"
    else
      print_result "FAIL" "Manifest missing 'icons' field"
    fi

  else
    print_result "FAIL" "Manifest is not valid JSON"
  fi
fi

echo ""

# ============================================
# 7. ACCESSIBILITY CHECKS
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  ACCESSIBILITY CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for ARIA labels
if grep -rq "aria-label" src/ 2>/dev/null; then
  print_result "PASS" "ARIA labels found in code"
else
  print_result "WARN" "No ARIA labels found"
fi

# Check for semantic HTML
if grep -rq "<nav" src/ 2>/dev/null; then
  print_result "PASS" "Semantic <nav> elements found"
else
  print_result "WARN" "No semantic <nav> elements found"
fi

# Check for alt text on images
if grep -rq 'alt=' src/ 2>/dev/null; then
  print_result "PASS" "Image alt attributes found"
else
  print_result "WARN" "No image alt attributes found"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

TOTAL=$((PASSED + FAILED + WARNINGS))
if [ $TOTAL -gt 0 ]; then
  PASS_RATE=$((PASSED * 100 / TOTAL))
  echo "Pass Rate: $PASS_RATE%"
  echo ""
fi

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All critical tests passed!${NC}"

  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found. Review recommended.${NC}"
  else
    echo -e "${GREEN}✓ No warnings. Excellent!${NC}"
  fi

  echo ""
  echo "🚀 PWA is ready for production!"
  exit 0
else
  echo -e "${RED}✗ $FAILED test(s) failed.${NC}"
  echo ""
  echo "Please fix the failed tests before deploying to production."
  echo "See PWA_FIXES_GUIDE.md for solutions."
  exit 1
fi
