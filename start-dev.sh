#!/bin/bash

# 启动前后端开发服务器

echo "🚀 启动后端服务..."
cd fluent-life-api
PORT=8081 go run cmd/server/main.go > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"

sleep 2

echo "🚀 启动前端服务..."
cd ../fluent-life-frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端 PID: $FRONTEND_PID"

echo ""
echo "✅ 服务已启动！"
echo "📝 后端日志: tail -f backend.log"
echo "📝 前端日志: tail -f frontend.log"
echo "🔗 前端地址: http://localhost:3000"
echo "🔗 后端地址: http://localhost:8081"
echo ""
echo "停止服务: kill $BACKEND_PID $FRONTEND_PID"


