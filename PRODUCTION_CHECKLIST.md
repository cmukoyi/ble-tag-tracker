# 🚀 Production Deployment Checklist

Use this checklist to ensure your BLE Tag Tracker is production-ready!

## Phase 1: Configuration ⚙️

### Backend Setup
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Edit `.env` with actual OAuth credentials:
  - [ ] CLIENT_ID
  - [ ] CLIENT_SECRET
  - [ ] USERNAME
  - [ ] PASSWORD
- [ ] Set `DEBUG=False` in `.env`
- [ ] Verify `.env` is NOT committed to git
- [ ] Install dependencies: `pip install -r backend/requirements.txt`

### Frontend Setup
- [ ] Open `js/map.js`
- [ ] Set `CONFIG.PRODUCTION = true` (line ~6)
- [ ] Verify BACKEND_URL is using dynamic detection
- [ ] (Optional) Minify JavaScript for production

## Phase 2: Security Review 🔒

- [ ] OAuth credentials moved to backend ✅ (Done)
- [ ] No hardcoded passwords in frontend ✅ (Done)
- [ ] `.gitignore` includes `.env` ✅ (Done)
- [ ] CORS configured for your domain (in `backend/app.py`)
- [ ] Consider enabling HTTPS for production
- [ ] Review and update error messages (no sensitive data exposed)

## Phase 3: Performance Optimization ⚡

- [ ] Production mode enabled (`CONFIG.PRODUCTION = true`)
- [ ] Token caching working ✅ (Done)
- [ ] Debug logs disabled in production
- [ ] Auto-refresh interval configured (current: 10 min)
- [ ] (Optional) JavaScript minification
- [ ] (Optional) Enable gzip compression on web server

## Phase 4: Testing 🧪

### Local Testing
- [ ] Backend starts without errors
- [ ] Health check responds: `http://localhost:5000/api/health`
- [ ] Token endpoint works: `http://localhost:5000/api/token`
- [ ] Frontend loads successfully
- [ ] Map displays correctly
- [ ] Can add/remove tags
- [ ] Tag locations update
- [ ] Settings panels work
- [ ] Account/Logout functional

### Mobile Testing (Same WiFi)
- [ ] Server accessible from mobile (http://192.168.x.x:5000)
- [ ] App loads on mobile browser
- [ ] All features work on mobile
- [ ] PWA installable
- [ ] Offline mode works (service worker)

### Performance Testing
- [ ] Page load time acceptable
- [ ] Map renders smoothly
- [ ] No console errors (check with F12)
- [ ] Token auto-refreshes correctly
- [ ] Memory usage stable (no leaks)

## Phase 5: Deployment 🌍

### Choose Deployment Method
- [ ] **Option A: Local Network**
  - Run: `.\DEPLOY_PRODUCTION.ps1` (Windows)
  - Or: `./deploy_production.sh` (Linux/Mac)
  - Configure firewall for port 5000
  - Note IP address for mobile access

- [ ] **Option B: Docker**
  - Build: `docker build -t ble-tag-tracker .`
  - Run: `docker-compose up -d`
  - Verify health: `docker-compose logs -f`

- [ ] **Option C: Cloud (Heroku/Azure/AWS)**
  - Follow cloud-specific guide in DEPLOYMENT.md
  - Set environment variables on platform
  - Deploy code
  - Test public URL

### Post-Deployment
- [ ] Verify all endpoints accessible
- [ ] Test from different devices
- [ ] Check logs for errors
- [ ] Monitor token refresh behavior
- [ ] Verify data persistence (localStorage)

## Phase 6: Monitoring & Maintenance 📊

### Setup Monitoring
- [ ] Health check endpoint monitored
- [ ] Error logging configured
- [ ] (Optional) Set up uptime monitoring
- [ ] (Optional) Configure alerts for failures

### Documentation
- [ ] Update README with your deployment details
- [ ] Document any custom configuration
- [ ] Save backup of `.env` file (securely!)
- [ ] Note down access URLs

### Backup Strategy
- [ ] Create backup: `Compress-Archive -Path . -DestinationPath ../backup.zip`
- [ ] Test restoration process
- [ ] Document rollback procedure
- [ ] Schedule regular backups

## Phase 7: Go Live! 🎉

### Final Checks
- [ ] All checklist items above completed
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] All features tested and working
- [ ] Documentation updated
- [ ] Backup created

### Launch
- [ ] Start production server
- [ ] Share access URLs with users
- [ ] Monitor for first 24 hours
- [ ] Collect user feedback
- [ ] Address any issues promptly

## 🆘 Emergency Rollback

If something goes wrong:

1. Stop the server
2. Restore from backup:
   ```powershell
   Expand-Archive -Path ../backup.zip -DestinationPath .
   ```
3. Restart server
4. Investigate issue
5. Fix and redeploy

## 📝 Production Launch Notes

**Deployment Date:** _________________

**Deployment Method:** _________________

**Access URLs:**
- Desktop: _________________
- Mobile: _________________
- Public: _________________

**Known Issues:** _________________

**Next Steps:** _________________

---

## ✅ Quick Command Reference

```powershell
# Windows - Start Production
.\DEPLOY_PRODUCTION.ps1

# Linux/Mac - Start Production  
./deploy_production.sh

# Docker - Start
docker-compose up -d

# Check Health
curl http://localhost:5000/api/health

# View Logs (Docker)
docker-compose logs -f

# Stop Server (Docker)
docker-compose down

# Backup
Compress-Archive -Path . -DestinationPath ../backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip
```

---

**Ready to deploy?** Go through each section systematically, and mark items as complete!

For detailed information, see:
- [README_PRODUCTION.md](README_PRODUCTION.md) - Production guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment options
- [README.md](README.md) - Development guide
