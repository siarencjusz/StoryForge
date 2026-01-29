#!/bin/bash

# StoryForge Development Runner
# This script starts both the backend and frontend development servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${GREEN}Starting StoryForge Development Environment${NC}"
echo "============================================"

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    # Kill all background processes
    jobs -p | xargs -r kill 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Check if node_modules exists in frontend
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd "$PROJECT_ROOT/frontend"
    npm install
fi

# Start frontend dev server
echo -e "${GREEN}Starting frontend (Vite)...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 2

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}StoryForge is running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Frontend: ${YELLOW}http://localhost:5173${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop all services"
echo ""

# Wait for any process to exit
wait $FRONTEND_PID
