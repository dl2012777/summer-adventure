#!/bin/bash
# 将腾讯云凭据安全存入 macOS Keychain
# 使用：bash scripts/save-creds.sh
# 凭据只会存储在 Keychain，不会写入任何磁盘文件
set -e

SERVICE="summer-adventure"

echo "🔐 存储腾讯云凭据到 macOS Keychain"
echo ""

read -p "请输入 SecretId: " SECRET_ID
read -sp "请输入 SecretKey: " SECRET_KEY
echo ""

if [ -z "$SECRET_ID" ] || [ -z "$SECRET_KEY" ]; then
  echo "❌ 凭据不能为空"
  exit 1
fi

security add-generic-password -a "$SERVICE" -s "TC_SECRET_ID" -w "$SECRET_ID" -U 2>/dev/null
security add-generic-password -a "$SERVICE" -s "TC_SECRET_KEY" -w "$SECRET_KEY" -U 2>/dev/null

echo ""
echo "✅ 凭据已安全存储到 macOS Keychain，磁盘不留明文。"
echo "   启动评测服务：bash scripts/start-soe.sh"
