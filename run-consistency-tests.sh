#!/bin/bash

# Cross-Platform Data Consistency Test Runner
# This script sets up the environment and runs comprehensive tests

echo "🚀 WorkLink Cross-Platform Data Consistency Test Suite"
echo "======================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required dependencies are installed
check_dependencies() {
    print_status "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi

    # Check if puppeteer is installed
    if ! node -e "require('puppeteer')" &> /dev/null; then
        print_warning "Puppeteer not found, installing..."
        npm install puppeteer
    fi

    print_success "All dependencies are available"
}

# Function to check if servers are running
check_servers() {
    print_status "Checking if servers are running..."

    # Check backend server (port 3000)
    if ! curl -s http://localhost:3000/health > /dev/null; then
        print_error "Backend server (port 3000) is not running"
        print_status "Please start the backend server with: npm run dev:server"
        exit 1
    fi

    # Check admin portal (port 5173)
    if ! curl -s http://localhost:5173/admin > /dev/null; then
        print_warning "Admin portal (port 5173) is not responding"
        print_status "Please start the admin portal with: npm run dev:admin"
    fi

    # Check worker PWA (port 8080)
    if ! curl -s http://localhost:8080 > /dev/null; then
        print_warning "Worker PWA (port 8080) is not responding"
        print_status "Please start the worker PWA with: npm run dev:worker"
    fi

    print_success "Server connectivity check completed"
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."

    # Create test directories if they don't exist
    mkdir -p test-screenshots
    mkdir -p test-results

    # Backup current database (optional)
    if [ -f "./data/worklink.db" ]; then
        cp ./data/worklink.db ./data/worklink.db.backup.$(date +%Y%m%d_%H%M%S)
        print_status "Database backed up"
    fi

    # Ensure test data exists
    if [ -f "./db/seeders/sample.js" ]; then
        print_status "Seeding test data..."
        node -e "require('./db/seeders/sample').seedSampleData()"
    fi

    print_success "Test environment setup completed"
}

# Function to run specific test categories
run_test_category() {
    local category=$1
    print_status "Running $category tests..."

    case $category in
        "user-data")
            node -e "
                const CrossPlatformTester = require('./test-cross-platform-consistency');
                const tester = new CrossPlatformTester();
                tester.initialize().then(() => {
                    return tester.runTest('User Data Consistency', () => tester.testUserDataConsistency());
                }).then(() => {
                    return tester.cleanup();
                }).catch(console.error);
            "
            ;;
        "jobs")
            node -e "
                const CrossPlatformTester = require('./test-cross-platform-consistency');
                const tester = new CrossPlatformTester();
                tester.initialize().then(() => {
                    return tester.runTest('Job Data Synchronization', () => tester.testJobDataSync());
                }).then(() => {
                    return tester.cleanup();
                }).catch(console.error);
            "
            ;;
        "gamification")
            node -e "
                const CrossPlatformTester = require('./test-cross-platform-consistency');
                const tester = new CrossPlatformTester();
                tester.initialize().then(() => {
                    return tester.runTest('Gamification Consistency', () => tester.testGamificationConsistency());
                }).then(() => {
                    return tester.cleanup();
                }).catch(console.error);
            "
            ;;
        "realtime")
            node -e "
                const CrossPlatformTester = require('./test-cross-platform-consistency');
                const tester = new CrossPlatformTester();
                tester.initialize().then(() => {
                    return tester.runTest('Real-time Updates', () => tester.testRealTimeUpdates());
                }).then(() => {
                    return tester.cleanup();
                }).catch(console.error);
            "
            ;;
        *)
            print_error "Unknown test category: $category"
            print_status "Available categories: user-data, jobs, gamification, realtime"
            exit 1
            ;;
    esac
}

# Function to run all tests
run_all_tests() {
    print_status "Running comprehensive cross-platform data consistency tests..."

    # Run the main test suite
    if node test-cross-platform-consistency.js; then
        print_success "All tests completed successfully!"
    else
        print_error "Some tests failed. Check the reports for details."
        exit 1
    fi
}

# Function to generate summary report
generate_summary() {
    print_status "Generating test summary..."

    # Find the latest test report
    LATEST_REPORT=$(ls -t test-results/test-report-*.json 2>/dev/null | head -1)

    if [ -n "$LATEST_REPORT" ]; then
        print_success "Latest report: $LATEST_REPORT"

        # Extract summary from JSON report
        node -e "
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('$LATEST_REPORT', 'utf8'));
            console.log('\\n📊 TEST SUMMARY');
            console.log('================');
            console.log(\`Total Tests: \${report.summary.total}\`);
            console.log(\`Passed: \${report.summary.passed}\`);
            console.log(\`Failed: \${report.summary.failed}\`);
            console.log(\`Success Rate: \${((report.summary.passed / report.summary.total) * 100).toFixed(2)}%\`);
            console.log(\`Duration: \${(report.duration / 1000).toFixed(2)}s\`);

            if (report.summary.errors.length > 0) {
                console.log('\\n❌ FAILED TESTS:');
                report.summary.errors.forEach(error => {
                    console.log(\`  - \${error.test}: \${error.error}\`);
                });
            }
        "
    else
        print_warning "No test reports found"
    fi
}

# Function to open test report in browser
open_report() {
    LATEST_HTML_REPORT=$(ls -t test-results/test-report-*.html 2>/dev/null | head -1)

    if [ -n "$LATEST_HTML_REPORT" ]; then
        print_status "Opening test report in browser..."

        # Try to open in default browser
        if command -v xdg-open &> /dev/null; then
            xdg-open "$LATEST_HTML_REPORT"
        elif command -v open &> /dev/null; then
            open "$LATEST_HTML_REPORT"
        elif command -v start &> /dev/null; then
            start "$LATEST_HTML_REPORT"
        else
            print_status "Please open $LATEST_HTML_REPORT in your browser"
        fi
    else
        print_warning "No HTML reports found"
    fi
}

# Function to clean up test artifacts
cleanup() {
    print_status "Cleaning up test artifacts..."

    # Remove old screenshots (keep last 10)
    if [ -d "test-screenshots" ]; then
        find test-screenshots -name "*.png" -type f | sort -r | tail -n +11 | xargs rm -f 2>/dev/null || true
    fi

    # Remove old reports (keep last 5)
    if [ -d "test-results" ]; then
        find test-results -name "test-report-*.json" -type f | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true
        find test-results -name "test-report-*.html" -type f | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true
    fi

    print_success "Cleanup completed"
}

# Main script logic
case "${1:-all}" in
    "check")
        check_dependencies
        check_servers
        ;;
    "setup")
        setup_test_environment
        ;;
    "user-data"|"jobs"|"gamification"|"realtime")
        check_dependencies
        check_servers
        setup_test_environment
        run_test_category $1
        generate_summary
        ;;
    "all")
        check_dependencies
        check_servers
        setup_test_environment
        run_all_tests
        generate_summary
        ;;
    "report")
        open_report
        ;;
    "summary")
        generate_summary
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  all                 Run all cross-platform consistency tests (default)"
        echo "  user-data          Run user data consistency tests only"
        echo "  jobs               Run job data synchronization tests only"
        echo "  gamification       Run gamification consistency tests only"
        echo "  realtime           Run real-time update tests only"
        echo "  check              Check dependencies and server status"
        echo "  setup              Setup test environment"
        echo "  summary            Show summary of latest test run"
        echo "  report             Open latest test report in browser"
        echo "  cleanup            Clean up old test artifacts"
        echo "  help               Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                 # Run all tests"
        echo "  $0 user-data       # Test only user data consistency"
        echo "  $0 check           # Check if environment is ready"
        echo "  $0 summary         # Show results of last test run"
        ;;
    *)
        print_error "Unknown command: $1"
        print_status "Run '$0 help' for usage information"
        exit 1
        ;;
esac

echo ""
print_success "Operation completed!"