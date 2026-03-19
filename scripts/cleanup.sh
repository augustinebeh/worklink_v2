#!/bin/bash

# CLEANUP SCRIPT - Removes unnecessary files
# Run this to clean up the project

cd /home/augustine/Augustine_Projects/worklink_v2

echo "🧹 WORKLINK V2 CLEANUP SCRIPT"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Track deletions
DELETED_COUNT=0
DELETED_SIZE=0

# Function to delete and log
delete_file() {
    if [ -f "$1" ]; then
        SIZE=$(du -h "$1" | cut -f1)
        echo "  🗑️  Deleting: $1 ($SIZE)"
        rm -f "$1"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
}

echo "📦 STEP 1: Removing OLD_BACKUP files..."
delete_file "utils/groq-interview-scheduler.js.OLD_BACKUP"
delete_file "utils/interview-scheduling-engine.js.OLD_BACKUP"
echo ""

echo "📦 STEP 2: Removing test files from root..."
delete_file "test-chat-agents.js"
delete_file "test-internal-slm.js"
delete_file "test-live-system.js"
delete_file "test-new-scheduler.js"
delete_file "test-real-deployment.js"
delete_file "test-real-scheduler.js"
delete_file "test-slm-websocket-integration.js"
delete_file "test_live_scheduler.js"
delete_file "test_scheduler_v2.js"
echo ""

echo "📦 STEP 3: Removing old test files from tests/ directory..."
delete_file "tests/test-groq-scheduling.js"
delete_file "tests/test-scheduling-fix.js"
echo ""

echo "📦 STEP 4: Keeping essential test files..."
echo "  ✅ Keeping: test-vigorous-scheduler.js (documentation/reference)"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ CLEANUP COMPLETE!"
echo ""
echo "📊 Summary:"
echo "  Files deleted: $DELETED_COUNT"
echo ""
echo "📁 Remaining structure:"
echo "  ✅ utils/new-interview-scheduler.js (active scheduler)"
echo "  ✅ utils/interview-scheduling-engine.js (for analytics)"
echo "  ✅ services/websocket-handlers.js (active)"
echo "  ✅ test-vigorous-scheduler.js (kept for reference)"
echo ""
echo "🎉 Project is now cleaned up!"
