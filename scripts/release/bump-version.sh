#!/bin/bash
# OrbitFolio Release Script
# Usage: ./scripts/release/bump-version.sh [major|minor|patch]

set -e

VERSION_TYPE=${1:-patch}

echo "🚀 OrbitFolio Release - Bumping $VERSION_TYPE version..."

# Bump version in package.json
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")

# Create git tag
git add package.json package-lock.json
git commit -m "chore: release v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo "✅ Version bumped to v$NEW_VERSION"
echo "📦 Run 'git push && git push --tags' to publish"
