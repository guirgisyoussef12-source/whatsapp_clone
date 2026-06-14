#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/all.sh \"commit message\""
    exit 1
fi

echo "=== Starting containers ==="
bash scripts/run.sh


echo "=== Running tests + pushing to GitHub ==="
git add .
bash scripts/git_sync.sh "$1"

echo "=== Cleaning up ==="
bash scripts/cleanup.sh

echo "Pipeline complete"