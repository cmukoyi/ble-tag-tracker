# BLE Tag Tracker - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env` in `backend/` directory
- [ ] Update `.env` with your actual credentials:
  ```bash
  CLIENT_SECRET=your_actual_secret
  USERNAME=your_api_username
  PASSWORD=your_api_password
  ```
- [ ] Set `DEBUG=False` in `.env` for production
- [ ] Verify `.env` is in `.gitignore` (already configured)

### 2. Security Review
- [x] OAuth credentials moved to backend (✅ Done)
- [x] Environment variables configured (✅ Done)  
- [x] `.gitignore` configured to exclude `.env` (✅ Done)
- [ ] Change default passwords if using custom auth
- [ ] Review CORS settings in `backend/app.py` for your domain

### 3. Performance Optimization
- [x] Debug logging controlled by `CONFIG.PRODUCTION` flag (✅ Done)
- [x] Token caching implemented (✅ Done)
- [ ] Set `CONFIG.PRODUCTION = true` in `js/map.js` before deployment
- [ ] Consider minifying JavaScript for production
- [ ] Enable gzip compression on web server

## 🚀 Deployment Options

### Option 1: Deploy to Local Network (Mobile Access)

**Best for:** Testing on mobile devices on same WiFi

1. **Start the server:**
   ```powershell
   .\START_SERVER.ps1
   ```

2. **Access from devices:**
   - Desktop: `http://localhost:5000`
   - Mobile: `http://192.168.x.x:5000` (IP shown on startup)

3. **Firewall configuration:**
   ```powershell
   # Allow port 5000 through Windows Firewall
   New-NetFirewallRule -DisplayName "BLE Tag Tracker" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
   ```

### Option 2: Deploy with Gunicorn (Linux/Production)

**Best for:** Production deployment on Linux server

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run with Gunicorn:**
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

3. **Create systemd service** (`/etc/systemd/system/bletags.service`):
   ```ini
   [Unit]
   Description=BLE Tag Tracker Backend
   After=network.target

   [Service]
   User=your_user
   WorkingDirectory=/path/to/bleTags/backend
   Environment="PATH=/path/to/venv/bin"
   ExecStart=/path/to/venv/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

4. **Start service:**
   ```bash
   sudo systemctl start bletags
   sudo systemctl enable bletags
   ```

### Option 3: Deploy with Docker

**Best for:** Containerized deployment

1. **Create Dockerfile** (see `Dockerfile` in root)

2. **Build and run:**
   ```bash
   docker build -t ble-tag-tracker .
   docker run -d -p 5000:5000 --env-file backend/.env ble-tag-tracker
   ```

### Option 4: Deploy to Cloud (Azure/AWS/GCP)

**Best for:** Public internet access

- **Azure Web App**: Deploy as Python web app
- **AWS Elastic Beanstalk**: Deploy Flask application
- **Google Cloud Run**: containerized deployment
- **Heroku**: `Procfile` provided

## 🔧 Production Configuration

### JavaScript Configuration (`js/map.js`)

Before deployment, update:

```javascript
const CONFIG = {
    PRODUCTION: true,  // 🚨 SET TO TRUE FOR PRODUCTION
    BACKEND_URL: `${window.location.protocol}//${window.location.hostname}:5000`,
    // ... other settings
};
```

### Backend Configuration (`backend/.env`)

```bash
# Production settings
DEBUG=False
FLASK_ENV=production
HOST=0.0.0.0
PORT=5000
```

## 📊 Performance Tuning

### 1. Browser Caching
Add to `backend/app.py`:
```python
@app.after_request
def add_header(response):
    response.cache_control.max_age = 300  # 5 minutes
    return response
```

### 2. JavaScript Minification
```bash
# Install terser
npm install -g terser

# Minify
terser js/map.js -o js/map.min.js -c -m
```

Then update `index.html`:
```html
<script src="js/map.min.js"></script>
```

### 3. Enable Gzip (Nginx example)
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

## 🔒 Security Hardening

### 1. HTTPS Configuration
- Obtain SSL certificate (Let's Encrypt recommended)
- Configure reverse proxy (Nginx/Apache) with SSL
- Update `BACKEND_URL` to use `https://`

### 2. Rate Limiting
Add to `backend/app.py`:
```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/api/token')
@limiter.limit("10 per minute")
def get_token():
    # ... existing code
```

### 3. CORS Configuration
Update for your domain:
```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://yourdomain.com"]
    }
})
```

## 📱 Mobile-Specific Optimizations

### PWA Configuration
Already configured in `manifest.json`:
- Install as app on mobile
- Offline support via service worker
- App icons included

### Service Worker
Update cache version when deploying:
```javascript
// In service-worker.js
const CACHE_NAME = 'ble-tracker-v1.0.1';  // Increment version
```

## 🧪 Testing Before Deployment

### 1. Automated Tests (recommended)
```bash
# Test API endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/token
```

### 2. Performance Testing
- Test with multiple concurrent users
- Monitor memory usage
- Check token refresh behavior

### 3. Mobile Testing
- Test on iOS Safari
- Test on Android Chrome
- Test offline functionality
- Test PWA installation

## 📦 Backup & Rollback

### Create Backup
```powershell
# Create backup before deployment
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Compress-Archive -Path . -DestinationPath "../backup_$timestamp.zip"
```

### Rollback
```powershell
# Restore from backup if needed
Expand-Archive -Path "../backup_YYYYMMDD_HHMMSS.zip" -DestinationPath .
```

## 📈 Monitoring

### Health Check Endpoint
Monitor at: `http://your-server:5000/api/health`

Returns:
```json
{
    "status": "healthy",
    "token_cached": true,
    "token_expires_at": "2026-02-20T10:30:00"
}
```

### Logging
Production logs location:
- Linux: `/var/log/bletags/`
- Windows: Check PowerShell output or configure file logging

## 🚨 Troubleshooting

### Issue: Backend not accessible from mobile
**Solution**: Check firewall, verify local IP address, ensure using `0.0.0.0` as host

### Issue: Token refresh failing
**Solution**: Check .env credentials, verify network connectivity to OAuth server

### Issue: Map not loading
**Solution**: Check browser console, verify API endpoints, check CORS configuration

## 📞 Support

For issues or questions:
- Check browser console (F12) for errors
- Review backend logs
- Verify API credentials in `.env`
- Test health endpoint

---

**Ready to deploy?** Follow the checklist above and choose your deployment option!
