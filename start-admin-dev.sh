#!/bin/bash

# 启动 fluent-life-admin-api 和 fluent-life-admin-frontend 开发服务器

echo "🚀 启动 fluent-life-admin-api 后端服务..."
cd fluent-life-admin-api
go run cmd/server/main.go > ../admin_backend.log 2>&1 &
ADMIN_BACKEND_PID=$!
echo "fluent-life-admin-api 后端 PID: $ADMIN_BACKEND_PID"

sleep 2

echo "🚀 启动 fluent-life-admin-frontend 前端服务..."
cd ../fluent-life-admin-frontend
npm run dev > ../admin_frontend.log 2>&1 &
ADMIN_FRONTEND_PID=$!
echo "fluent-life-admin-frontend 前端 PID: $ADMIN_FRONTEND_PID"

echo ""
echo "✅ 服务已启动！"
echo "📝 后端日志: tail -f admin_backend.log"
echo "📝 前端日志: tail -f admin_frontend.log"
echo "🔗 前端地址: http://localhost:5173"
echo "🔗 后端地址: http://localhost:8082"
echo ""
echo "停止服务: kill $ADMIN_BACKEND_PID $ADMIN_FRONTEND_PID"
