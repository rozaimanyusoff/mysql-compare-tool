#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MySQL Compare Tool - Web Version Setup${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)\n"

# Setup Backend
echo -e "${BLUE}📦 Setting up Backend...${NC}\n"
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
    echo -e "${GREEN}✓ Backend dependencies installed${NC}\n"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}\n"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created backend .env file${NC}\n"
else
    echo -e "${GREEN}✓ Backend .env already exists${NC}\n"
fi

cd ..

# Setup Frontend
echo -e "${BLUE}⚛️  Setting up Frontend...${NC}\n"
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}\n"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}\n"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created frontend .env file${NC}\n"
else
    echo -e "${GREEN}✓ Frontend .env already exists${NC}\n"
fi

cd ..

echo -e "${GREEN}✅ Setup complete!${NC}\n"

echo -e "${BLUE}🚀 To start the application (SINGLE COMMAND):${NC}\n"
echo "  npm run dev\n"

echo -e "${BLUE}OR run in separate terminals:${NC}\n"
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  npm run dev\n"

echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev\n"

echo -e "Then open: ${GREEN}http://localhost:3000${NC}"
