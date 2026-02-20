#!/bin/bash
# deploy_production.sh
# Production deployment script for BLE Tag Tracker (Linux/Mac)

echo "=========================================================="
echo "🚀 BLE Tag Tracker - Production Deployment"
echo "=========================================================="
echo ""

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "❌ ERROR: backend/.env file not found!"
    echo ""
    echo "📋 Setup Instructions:"
    echo "   1. Copy backend/.env.example to backend/.env"
    echo "   2. Edit backend/.env with your credentials"
    echo "   3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo "❌ ERROR: Python 3 not found!"
    echo "   Install Python 3.11+ first"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "✅ Python found: $PYTHON_VERSION"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv backend/venv
fi

# Activate virtual environment
source backend/venv/bin/activate

# Install/upgrade dependencies
echo "📦 Installing production dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Get local IP for mobile access
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "🌍 Server Access URLs:"
echo "   Desktop:  http://localhost:5000"
if [ -n "$LOCAL_IP" ]; then
    echo "   Mobile:   http://$LOCAL_IP:5000"
fi
echo ""

echo "🔧 Production Mode Enabled"
echo "   - Debug logging: DISABLED"
echo "   - Console logs: MINIMAL"
echo "   - Credentials: SECURED in .env"
echo ""

echo "🚀 Starting production server with Gunicorn..."
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""
echo "=========================================================="
echo ""

# Start with gunicorn
cd backend
gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 app:app
