#!/bin/bash

# StoryForge Development Runner
# This script starts the development server

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

# Check if node_modules exists
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd "$PROJECT_ROOT"
    npm install
fi

# Start dev server
echo -e "${GREEN}Starting Vite dev server...${NC}"
cd "$PROJECT_ROOT"
npm run dev &
DEV_PID=$!

# Wait a moment for server to start
sleep 2

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}StoryForge is running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "App: ${YELLOW}http://localhost:5173${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop"
echo ""

# Wait for the dev server
wait $DEV_PID
