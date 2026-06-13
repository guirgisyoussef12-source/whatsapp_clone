#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/all.sh \"commit message\""
    exit 1
fi

echo "=== 🔌 Starting containers ==="
./scripts/run.sh

echo "=== 🧪 Running tests + pushing to GitHub ==="
git add .
./scripts/git_sync.sh "$1"

echo "=== 🧹 Cleaning up ==="
./scripts/cleanup.sh

echo "✅ Pipeline complete!"
