#!/bin/bash
# Docker entrypoint script to handle both development and production modes

set -e

# Check if DEBUG mode is enabled
if [ "$DEBUG" = "True" ] || [ "$DEBUG" = "true" ]; then
    echo "🔧 Starting in DEVELOPMENT mode..."
    echo "📧 PIN codes will be displayed in console output"
    echo "============================================================"
    
    # Use Flask development server for better console output
    cd /app/backend
    exec python app.py
else
    echo "🚀 Starting in PRODUCTION mode with Gunicorn..."
    
    # Use Gunicorn for production with proper logging
    cd /app/backend
    exec gunicorn \
        --bind 0.0.0.0:5000 \
        --workers 4 \
        --timeout 120 \
        --access-logfile - \
        --error-logfile - \
        --log-level info \
        app:app
fi
