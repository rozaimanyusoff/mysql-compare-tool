#!/bin/bash

# MySQL Compare Tool - Quick Start Script
# Usage: bash quickstart.sh

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     MySQL Compare Tool - Quick Start                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📋 Creating .env from template..."
    cp .env.example .env
    echo "✅ .env created. Please edit it with your MySQL credentials:"
    echo "   nano .env"
    echo ""
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Please install Node.js v18+ first."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION found"
echo ""

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo "❌ npm not installed."
    exit 1
fi

echo "✅ npm found"
echo ""

# Build check
if [ ! -d "dist" ]; then
    echo "📦 Building project (first time)..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed!"
        exit 1
    fi
    echo "✅ Build successful"
else
    echo "✅ Project already built"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    READY TO START!                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Commands:"
echo "  npm start              Run the tool (production)"
echo "  npm run dev            Run the tool (development with auto-reload)"
echo "  npm run build          Rebuild TypeScript"
echo "  npm run clean          Clean build directory"
echo ""
echo "Documentation:"
echo "  README.md              Main documentation"
echo "  CHANGELOG.md           What changed in this version"
echo "  LOGS.md                How to read and use log files"
echo "  DEPLOYMENT.md          Deployment and troubleshooting"
echo ""
echo "Starting tool..."
echo ""
npm start
