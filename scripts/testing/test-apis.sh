#!/bin/bash

echo "🧪 Testing WorkLink Retention Features"
echo "======================================"

BASE_URL="http://localhost:8080"
CANDIDATE_ID="CND_DEMO_001"

echo ""
echo "1️⃣ Testing API Health..."
curl -s "$BASE_URL/health" | jq '.' 2>/dev/null || echo "❌ Server not running or health endpoint not responding"

echo ""
echo "2️⃣ Testing Notification Status..."
curl -s "$BASE_URL/api/v1/notifications/status/$CANDIDATE_ID" | jq '.' 2>/dev/null || echo "❌ Status endpoint not responding"

echo ""
echo "3️⃣ Testing Streak Protection (Demo)..."
curl -s -X POST "$BASE_URL/api/v1/notifications/protect-streak" \
     -H "Content-Type: application/json" \
     -d "{\"candidateId\": \"$CANDIDATE_ID\"}" | jq '.' 2>/dev/null || echo "❌ Protect streak endpoint not responding"

echo ""
echo "4️⃣ Testing Streak Recovery (Demo)..."
curl -s -X POST "$BASE_URL/api/v1/notifications/recover-streak" \
     -H "Content-Type: application/json" \
     -d "{\"candidateId\": \"$CANDIDATE_ID\"}" | jq '.' 2>/dev/null || echo "❌ Recover streak endpoint not responding"

echo ""
echo "5️⃣ Testing Push Notification (Demo)..."
if [ "$NODE_ENV" != "production" ]; then
    curl -s -X POST "$BASE_URL/api/v1/notifications/test-retention/$CANDIDATE_ID/streak_risk" | jq '.' 2>/dev/null || echo "❌ Test notification endpoint not responding"
else
    echo "⚠️ Test notifications disabled in production"
fi

echo ""
echo "✅ API Testing Complete!"
echo ""
echo "📱 To test the UI:"
echo "   1. Open http://localhost:8080 in your browser"
echo "   2. Login with: sarah.tan@email.com / password"
echo "   3. Look for the enhanced streak card"
echo "   4. Click on it to open the protection modal"
echo "   5. Test the freeze/recovery token features"
echo ""