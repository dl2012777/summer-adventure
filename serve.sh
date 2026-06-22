#!/bin/bash
set -e
PORT=${1:-8123}
VERSION=$(git rev-parse --short HEAD 2>/dev/null || date +%s)
echo "// Auto-generated — do not edit manually" > js/version.js
echo "window.APP_VERSION = \"$VERSION\";" >> js/version.js
echo "🚀 Summer Adventure v$VERSION"
echo "   http://127.0.0.1:$PORT"
python3 serve.py "$PORT"
