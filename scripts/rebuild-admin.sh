#!/bin/bash
# Rebuild Admin Portal
# Run this after modifying frontend code

echo "🔨 Rebuilding Admin Portal..."
echo ""

cd /home/augustine/Augustine_Projects/worklink_v2/admin

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install --legacy-peer-deps
fi

echo "🏗️ Building admin portal..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Admin portal rebuilt successfully!"
  echo "📁 Built files: admin/dist/"
  echo ""
  echo "🚀 Restart your server:"
  echo "   cd /home/augustine/Augustine_Projects/worklink_v2"
  echo "   npm start"
else
  echo ""
  echo "❌ Build failed! Check errors above."
fi
