#!/bin/bash

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting MySQL Compare Tool...${NC}\n"

# Kill any existing processes on ports 5000 and 3000
echo "Cleaning up old processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1

echo -e "${GREEN}✓ Starting Backend on port 5000...${NC}"
echo -e "${GREEN}✓ Starting Frontend on port 3000...${NC}\n"

# Run both with concurrently
npm run dev

# If concurrently is not installed, provide helpful message
if [ $? -ne 0 ]; then
    echo -e "\n${BLUE}First time setup? Run:${NC}"
    echo "  bash setup-web.sh"
fi
