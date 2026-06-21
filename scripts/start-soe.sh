#!/bin/bash
# 从 macOS Keychain 读取凭据，启动腾讯口语评测后端
set -e

SERVICE="summer-adventure"

echo "🔑 从 Keychain 读取凭据..."
TC_SECRET_ID=$(security find-generic-password -a "$SERVICE" -s "TC_SECRET_ID" -w 2>/dev/null)
TC_SECRET_KEY=$(security find-generic-password -a "$SERVICE" -s "TC_SECRET_KEY" -w 2>/dev/null)

if [ -z "$TC_SECRET_ID" ] || [ -z "$TC_SECRET_KEY" ]; then
  echo "❌ 凭据未找到。请先运行：bash scripts/save-creds.sh"
  exit 1
fi

echo "  ✅ 凭据读取成功"
echo ""
echo "🚀 启动口语评测后端 http://127.0.0.1:8126"
TC_SECRET_ID="$TC_SECRET_ID" TC_SECRET_KEY="$TC_SECRET_KEY" node server.js
