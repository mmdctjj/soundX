#!/bin/bash
set -e

# 1. 确保数据库目录存在 (针对持久化挂载的情况)
mkdir -p /app/packages/db/prisma

# 2. 确保数据库存在并更新 schema
echo "Running prisma db push..."
cd /app/packages/db && npx prisma@6 db push --accept-data-loss --skip-generate

# 3. 启动 Nginx (后台运行)
echo "Starting Nginx..."
nginx

# 4. 启动 Python TTS 服务 (后台运行)
if [ "$DISABLE_TTS" != "true" ]; then
  echo "Starting TTS Service..."
  cd /app/services/tts && (python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8000 || echo "❌ TTS Service failed to start") > /var/log/tts.log 2>&1 &
else
  echo "TTS Service is disabled."
fi

# 5. 启动 Python ASR 服务 (后台运行)
if [ "$DISABLE_ASR" != "true" ]; then
  echo "Starting ASR Service..."
  cd /app/services/asr && (HF_ENDPOINT=https://hf-mirror.com python3 -m uvicorn src.main:app --host 0.0.0.0 --port 3300 || echo "❌ ASR Service failed to start") > /var/log/asr.log 2>&1 &
else
  echo "ASR Service is disabled."
fi

# 6. 启动 Python MI 服务 (后台运行)
if [ "$DISABLE_MI" != "true" ]; then
  echo "Starting MI Service..."
  cd /app/services/mi && (python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8080 || echo "❌ MI Service failed to start") > /var/log/mi.log 2>&1 &
else
  echo "MI Service is disabled."
fi

# 7. 启动 Node API 服务 (前台运行)
echo "Starting API Service..."
cd /app/services/api && node dist/main.js