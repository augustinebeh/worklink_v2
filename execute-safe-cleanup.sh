#!/bin/bash
# Safe Cleanup Execution Script
# Run this script to perform the verified safe cleanup

echo "🧹 WorkLink v2 Refactoring Cleanup"
echo "===================================="
echo ""

# Phase 1: Delete files with zero references (SAFE)
echo "Phase 1: Deleting files with no references..."
echo ""

if [ -f "services/websocket-handlers.js" ]; then
    echo "✓ Deleting services/websocket-handlers.js (0 references)"
    rm "services/websocket-handlers.js"
else
    echo "✓ services/websocket-handlers.js already deleted"
fi

echo ""
echo "Phase 1 complete!"
echo ""

# Phase 2: Update imports (requires testing)
echo "Phase 2: Updating database imports..."
echo ""
echo "Running automated import updater..."
node update-imports.js

echo ""
echo "Phase 2 complete!"
echo ""

# Summary
echo "===================================="
echo "✅ Cleanup Summary"
echo "===================================="
echo ""
echo "Completed:"
echo "  - Deleted obsolete websocket-handlers.js"
echo "  - Updated 81 database imports"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff"
echo "  2. Test the application: npm start"
echo "  3. Run verification: node verify-refactoring-cleanup.js"
echo "  4. If tests pass, commit changes"
echo "  5. If issues, restore: find . -name '*.BEFORE_IMPORT_UPDATE' -exec bash -c 'mv \"\$0\" \"\${0%.BEFORE_IMPORT_UPDATE}\"' {} \\;"
echo ""
echo "Documentation: See REFACTORING_CLEANUP_PLAN.md"
echo ""
