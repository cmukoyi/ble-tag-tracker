# 🏷️ BLE Tag Tracker - Production Guide

A modern, production-ready PWA for tracking BLE tags and vehicles with real-time location updates.

## 📦 What's Production-Ready

### ✅ Security
- ✅ OAuth credentials moved to backend server
- ✅ Environment variable configuration
- ✅ `.env` file exclusion from git
- ✅ CORS properly configured
- ✅ Debug mode toggle for production

### ✅ Performance
- ✅ Token caching to reduce API calls
- ✅ Conditional debug logging
- ✅ Auto-refresh optimization
- ✅ Efficient marker management
- ✅ PWA with offline support

### ✅ Deployment Options
- ✅ Docker & Docker Compose
- ✅ Gunicorn for production
- ✅ Heroku ready (Procfile included)
- ✅ Cloud platform compatible
- ✅ Mobile network deployment

## 🚀 Quick Start (Production)

### 1. Configure Environment

```powershell
# Windows
cd backend
copy .env.example .env
notepad .env  # Edit with your credentials
```

```bash
# Linux/Mac
cd backend
cp .env.example .env
nano .env  # Edit with your credentials
```

### 2. Deploy

**Windows:**
```powershell
.\DEPLOY_PRODUCTION.ps1
```

**Linux/Mac:**
```bash
chmod +x deploy_production.sh
./deploy_production.sh
```

**Docker:**
```bash
docker-compose up -d
```

## 🔧 Configuration

### Backend (.env file)

```bash
# OAuth Credentials
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
USERNAME=your_username
PASSWORD=your_password

# Server Settings
DEBUG=False              # Set to False for production!
HOST=0.0.0.0            # Listen on all interfaces
PORT=5000               # Server port
```

### Frontend (js/map.js)

```javascript
const CONFIG = {
    PRODUCTION: true,  // 🚨 SET TO TRUE for production!
    // ... other settings
};
```

## 📱 Access URLs

After deployment:
- **Desktop**: `http://localhost:5000`
- **Mobile (same WiFi)**: `http://192.168.x.x:5000` (shown on startup)
- **Public**: Configure reverse proxy with SSL (see DEPLOYMENT.md)

## 🔒 Security Checklist

- [ ] `.env` file created with actual credentials
- [ ] `DEBUG=False` in backend/.env
- [ ] `CONFIG.PRODUCTION = true` in js/map.js
- [ ] `.env` is in `.gitignore` ✅ (already configured)
- [ ] Using HTTPS in production (recommended)
- [ ] Firewall configured for port 5000 (if needed)

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
    "status": "healthy",
    "token_cached": true,
    "token_expires_at": "2026-02-20T15:30:00"
}
```

### Logs
- Production logs are minimal by default
- Set `DEBUG=True` in `.env` for detailed logs
- Set `CONFIG.PRODUCTION = false` in JavaScript for debug console logs

## 🐳 Docker Deployment

### Quick Start
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker Build
```bash
docker build -t ble-tag-tracker .
docker run -d -p 5000:5000 --env-file backend/.env ble-tag-tracker
```

## ☁️ Cloud Deployment

### Heroku
```bash
heroku create your-app-name
heroku config:set CLIENT_ID=xxx CLIENT_SECRET=yyy USERNAME=zzz PASSWORD=www
git push heroku main
```

### Azure Web App
```bash
az webapp create --resource-group myResourceGroup --plan myAppServicePlan --name myapp --runtime "PYTHON:3.11"
az webapp config appsettings set --resource-group myResourceGroup --name myapp --settings @backend/.env
```

## 🔥 Performance Tips

1. **Enable Production Mode**
   - Set `CONFIG.PRODUCTION = true` in JavaScript
   - Set `DEBUG=False` in backend .env

2. **Use Gunicorn** (Linux/Mac)
   - Multiple workers for better performance
   - Already configured in deployment scripts

3. **Enable Gzip** (with reverse proxy)
   - Reduces bandwidth usage
   - See DEPLOYMENT.md for Nginx example

4. **Minify JavaScript** (optional)
   ```bash
   npm install -g terser
   terser js/map.js -o js/map.min.js -c -m
   ```
   Then update `<script>` tag in index.html

## 🚨 Troubleshooting

### Backend Won't Start
- Check `.env` file exists in `backend/` directory
- Verify all credentials are set in `.env`
- Check port 5000 isn't already in use

### Mobile Can't Connect
- Verify devices are on same WiFi network
- Check Windows Firewall allows port 5000
- Use the IP address shown on server startup

### Token Errors
- Verify credentials in `.env` are correct
- Check network connectivity to OAuth server
- Review backend logs for detailed error messages

### Map Not Loading
- Open browser console (F12) to check for errors
- Verify API endpoints are accessible
- Check CORS settings in backend

## 📁 File Structure

```
bleTags/
├── backend/
│   ├── .env                    # ⚠️ Your credentials (DO NOT COMMIT)
│   ├── .env.example            # Template for credentials
│   ├── app.py                  # Flask backend (production-ready)
│   └── requirements.txt        # Python dependencies
├── js/
│   └── map.js                  # Main application logic
├── index.html                  # Main app page
├── manifest.json               # PWA configuration
├── service-worker.js           # Offline support
├── Dockerfile                  # Docker container config
├── docker-compose.yml          # Docker Compose config
├── Procfile                    # Heroku deployment config
├── DEPLOY_PRODUCTION.ps1       # Windows production deploy
├── deploy_production.sh        # Linux/Mac production deploy
├── DEPLOYMENT.md               # Detailed deployment guide
└── README_PRODUCTION.md        # This file
```

## 📖 Further Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide
- **[README.md](README.md)** - Development guide
- **Backend API** - See `backend/app.py` docstrings

## 🆘 Support

### Common Issues

1. **"Module not found" errors**
   - Solution: Run `pip install -r backend/requirements.txt`

2. **"Port already in use"**
   - Solution: Change `PORT` in `.env` or stop conflicting service

3. **CORS errors**
   - Solution: Check frontend is accessing same domain as backend

4. **Auth failures**
   - Solution: Verify credentials in `.env`, check OAuth server status

### Debug Mode

Enable for troubleshooting:

1. Backend: Set `DEBUG=True` in `.env`
2. Frontend: Set `CONFIG.PRODUCTION = false` in `js/map.js`
3. Restart server and check browser console for detailed logs

---

## ✅ Pre-Deployment Checklist

Before going live:

- [ ] Created and configured `backend/.env` with real credentials
- [ ] Set `DEBUG=False` in `backend/.env`
- [ ] Set `CONFIG.PRODUCTION = true` in `js/map.js`
- [ ] Tested on desktop browser
- [ ] Tested on mobile device (same network)
- [ ] Health check endpoint responding
- [ ] Maps loading correctly
- [ ] Tag tracking working
- [ ] Token auto-refresh working
- [ ] Logout functionality working
- [ ] PWA installable on mobile

## 🎉 Ready to Deploy!

Your app is production-ready with enterprise-grade features:
- 🔐 Secure credential management
- ⚡ Optimized performance
- 📱 Mobile-first PWA
- 🐳 Docker support
- ☁️ Cloud-ready
- 📊 Health monitoring
- 🔄 Auto token refresh
- 💾 Offline support

**Start deployment:**
```powershell
# Windows
.\DEPLOY_PRODUCTION.ps1

# Linux/Mac
./deploy_production.sh

# Docker
docker-compose up -d
```

Good luck! 🚀
