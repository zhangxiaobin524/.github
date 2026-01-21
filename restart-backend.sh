#!/bin/bash

# 重启后端服务器脚本

echo "🛑 正在停止后端服务..."

# 查找并杀死后端进程
BACKEND_PIDS=$(ps aux | grep "go run cmd/server/main.go" | grep -v grep | awk '{print $2}')
if [ -n "$BACKEND_PIDS" ]; then
    echo "找到后端进程: $BACKEND_PIDS"
    kill $BACKEND_PIDS 2>/dev/null
    sleep 1
    
    # 如果进程还在运行，强制杀死
    REMAINING=$(ps aux | grep "go run cmd/server/main.go" | grep -v grep | awk '{print $2}')
    if [ -n "$REMAINING" ]; then
        echo "强制停止后端进程..."
        kill -9 $REMAINING 2>/dev/null
    fi
else
    echo "未找到运行中的后端进程"
fi

# 也检查是否有编译后的二进制文件在运行
BINARY_PIDS=$(ps aux | grep "fluent-life-api/cmd/server/main" | grep -v grep | awk '{print $2}')
if [ -n "$BINARY_PIDS" ]; then
    echo "找到后端二进制进程: $BINARY_PIDS"
    kill $BINARY_PIDS 2>/dev/null
    sleep 1
    
    REMAINING=$(ps aux | grep "fluent-life-api/cmd/server/main" | grep -v grep | awk '{print $2}')
    if [ -n "$REMAINING" ]; then
        kill -9 $REMAINING 2>/dev/null
    fi
fi

sleep 1

echo "🚀 正在启动后端服务..."
cd fluent-life-api
PORT=8081 go run cmd/server/main.go > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"

sleep 2

# 检查进程是否成功启动
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ 后端服务已成功重启！"
    echo "📝 后端日志: tail -f backend.log"
    echo "🔗 后端地址: http://localhost:8081"
else
    echo "❌ 后端服务启动失败，请查看日志: tail -f backend.log"
fi
