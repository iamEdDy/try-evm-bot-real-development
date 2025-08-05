#!/bin/bash

echo "🚀 Starting EVM Bot with Frontend..."

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down..."
    kill $BOT_PID $API_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the bot in background
echo "🤖 Starting bot..."
node index.js &
BOT_PID=$!

# Wait a moment for bot to initialize
sleep 3

# Start the API server in background
echo "🌐 Starting API server..."
cd api && node server.js &
API_PID=$!

# Wait for API to start
sleep 2

# Start the React frontend in background
echo "🎨 Starting React frontend..."
cd ../frontend && npm start &
FRONTEND_PID=$!

echo "✅ All services started!"
echo "📊 Dashboard: http://localhost:3000"
echo "🔌 API: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait 