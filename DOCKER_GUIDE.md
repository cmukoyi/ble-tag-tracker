# Docker Deployment Guide

## 🐳 Running with Docker Compose

### Step 1: Build and Start the Container
```powershell
cd C:\Users\Carlos Mukoyi\Documents\code\FunTools\bleTags
docker-compose up --build
```

### Step 2: View Console Output (including PIN codes)
The console output will show in the same terminal where you ran `docker-compose up`.

**To see PINs for login:**
- When a user requests a login code, you'll see:
```
============================================================
📧 EMAIL PIN for test@example.com: 123456
============================================================
```

### Running in Background (Detached Mode)
```powershell
docker-compose up -d
```

### View Logs from Detached Container
```powershell
# View all logs
docker-compose logs

# Follow logs in real-time (like tail -f)
docker-compose logs -f

# View only recent logs
docker-compose logs --tail=100

# View logs for specific service
docker logs ble-tag-tracker -f
```

## 🔍 Finding Your PIN Codes in Docker Logs

When running in detached mode, use:
```powershell
docker logs ble-tag-tracker -f
```
Then request a login code from the app, and watch the terminal for the PIN.

## 📱 Accessing the Application

Once running, access at:
- **User Login**: `http://localhost:5000/login.html`
- **Main App**: `http://localhost:5000/index.html`
- **Admin Portal**: `http://localhost:5000/admin`

## 🛑 Stopping the Container

```powershell
# Stop and remove containers
docker-compose down

# Stop, remove containers, and remove images
docker-compose down --rmi all

# Stop without removing
docker-compose stop
```

## 🔄 Rebuilding After Code Changes

```powershell
# Rebuild and restart
docker-compose up --build

# Or in detached mode
docker-compose up --build -d
```

## 🐛 Debugging

### Check Container Status
```powershell
docker ps
```

### Check Container Health
```powershell
docker inspect ble-tag-tracker | Select-String -Pattern "Health"
```

### Enter Container Shell (for debugging)
```powershell
docker exec -it ble-tag-tracker /bin/bash
```

### View Real-time Resource Usage
```powershell
docker stats ble-tag-tracker
```

## 📋 Environment Variables

The container uses `backend/.env` file. Make sure it's configured:
- `DEBUG=True` is set in docker-compose.yml for development
- PINs will print to console when DEBUG is active

## ⚠️ Common Issues

### Port 5000 Already in Use
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Stop any Python processes
Get-Process python | Stop-Process

# Or change port in docker-compose.yml to "5001:5000"
```

### Can't See Console Output
- Make sure you're NOT running in detached mode (`-d` flag)
- Or use `docker logs ble-tag-tracker -f` to follow logs

### Container Won't Start
```powershell
# Check logs for errors
docker-compose logs

# Rebuild from scratch
docker-compose down --rmi all
docker-compose up --build
```

## 🚀 Production Deployment Notes

For production:
1. Set `DEBUG=False` in `.env`
2. Configure proper email settings (EMAIL_USERNAME, EMAIL_PASSWORD)
3. Use a reverse proxy (nginx) with SSL
4. Set up persistent database instead of in-memory storage
5. Consider using Docker secrets for sensitive data

## 📊 Monitoring in Production

```powershell
# Check health endpoint
curl http://localhost:5000/api/health

# View logs with timestamps
docker logs ble-tag-tracker -f -t

# Export logs to file
docker logs ble-tag-tracker > app-logs.txt
```
