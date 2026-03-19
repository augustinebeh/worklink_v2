#!/bin/bash
# Delete Database and Restart
# Run this from WSL: bash reset-database.sh

echo ""
echo "🗑️  DELETING OLD DATABASE..."
echo ""

cd "$(dirname "$0")"

# Check if database exists
if [ -f "data/worklink.db" ]; then
    echo "Found: data/worklink.db"
    rm -f data/worklink.db
    echo "✅ Deleted: data/worklink.db"
else
    echo "⚠️  data/worklink.db not found"
fi

if [ -f "data/worklink.db-wal" ]; then
    echo "Found: data/worklink.db-wal"
    rm -f data/worklink.db-wal
    echo "✅ Deleted: data/worklink.db-wal"
fi

if [ -f "data/worklink.db-shm" ]; then
    echo "Found: data/worklink.db-shm"
    rm -f data/worklink.db-shm
    echo "✅ Deleted: data/worklink.db-shm"
fi

echo ""
echo "🔍 Verifying deletion..."
echo ""

if [ -f "data/worklink.db" ]; then
    echo "❌ Database still exists! Permission issue?"
    exit 1
else
    echo "✅ Database successfully deleted!"
    echo ""
    echo "📝 What's left in data/:"
    ls -lah data/
    echo ""
    echo "🚀 Now run: npm start"
    echo ""
    echo "Expected output:"
    echo "  ✅ Schema created successfully"
    echo "  ✅ [Template] Created template: payment_timing_with_amount"
    echo "  ✅ [Template] Created template: payment_general_inquiry"
    echo "  ... (all 12 templates)"
    echo "  ✅ WorkLink v2 ready"
    echo ""
fi
