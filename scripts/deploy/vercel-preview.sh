#!/bin/bash
# OrbitFolio Vercel Preview Deployment
# Usage: ./scripts/deploy/vercel-preview.sh

set -e

echo "🔄 Deploying OrbitFolio to Vercel Preview..."

# Build first
npm run build

# Deploy to Vercel preview
npx vercel --confirm

echo "✅ Preview deployment complete!"
echo "📝 Check the Vercel dashboard for the preview URL"
