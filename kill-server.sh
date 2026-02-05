#!/bin/bash
# Kill WorkLink server running on port 8080

echo "🔍 Looking for processes on port 8080..."

# Find and kill processes
PIDS=$(lsof -ti :8080 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ No processes found on port 8080"
else
    echo "🔪 Killing processes: $PIDS"
    kill -9 $PIDS 2>/dev/null
    sleep 1
    
    # Verify they're dead
    if lsof -ti :8080 >/dev/null 2>&1; then
        echo "⚠️  Some processes still running, trying harder..."
        killall -9 node 2>/dev/null
    else
        echo "✅ Port 8080 is now free"
    fi
fi

# Also check for suspended jobs
JOBS=$(jobs -l 2>/dev/null | grep -i stopped)
if [ -n "$JOBS" ]; then
    echo "⚠️  Found suspended background jobs:"
    echo "$JOBS"
    echo "Run 'jobs' to see them, then 'kill %1' or 'fg' followed by Ctrl+C"
fi
