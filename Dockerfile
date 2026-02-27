# BLE Tag Tracker - Dockerfile
FROM python:3.11-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend files
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend/ ./backend/
COPY index.html ./
COPY login.html ./
COPY admin-login.html ./
COPY admin-dashboard.html ./
COPY manifest.json ./
COPY service-worker.js ./
COPY js/ ./js/
COPY css/ ./css/
COPY icons/ ./icons/
COPY assets/ ./assets/
COPY entrypoint.sh /app/

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Use entrypoint script to handle dev/prod modes
ENTRYPOINT ["/app/entrypoint.sh"]
