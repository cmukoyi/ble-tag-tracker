# 🚀 QUICK START - Production Deployment

**⏱️ Time needed: 15 minutes**

## Step 1: Configure Credentials (5 min)

```powershell
cd backend
copy .env.example .env
notepad .env
```

Edit these values in `.env`:
```bash
CLIENT_SECRET=g_SkQ.B.z3TeBU$g#hVeP#c2    # ✅ Already set (or use your own)
USERNAME=ScopeUKAPI                        # ✅ Already set (or use your own)
PASSWORD=ScopeUKAPI01!                     # ✅ Already set (or use your own)
DEBUG=False                                # 🚨 MUST BE False
```

Save and close.

## Step 2: Enable Production Mode (1 min)

Open `js/map.js` and find line 6:

```javascript
const CONFIG = {
    PRODUCTION: true,  // 🚨 Change from false to true
```

Save file.

## Step 3: Deploy! (5 min)

### Windows:
```powershell
.\DEPLOY_PRODUCTION.ps1
```

### Linux/Mac:
```bash
chmod +x deploy_production.sh
./deploy_production.sh
```

### Docker:
```bash
docker-compose up -d
```

## Step 4: Test (5 min)

Open browser:
- Desktop: `http://localhost:5000`
- Mobile: `http://192.168.x.x:5000` (IP shown on startup)

Test:
- [ ] Map loads
- [ ] Can search for vehicles
- [ ] Can add tags
- [ ] Settings work
- [ ] Logout works

## ✅ Done!

Your app is now running in production mode!

Need more details? See:
- [PRODUCTION_SUMMARY.md](PRODUCTION_SUMMARY.md) - What changed
- [README_PRODUCTION.md](README_PRODUCTION.md) - Full guide  
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - Detailed checklist
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment options

---

## 🆘 Having Issues?

**Backend won't start:**
```powershell
# Make sure .env exists
ls backend\.env

# Install dependencies
pip install -r backend\requirements.txt
```

**Mobile can't connect:**
- Check you're on the same WiFi
- Use the IP address shown when server starts
- Check Windows Firewall allows port 5000

**Token errors:**
- Verify credentials in `.env` are correct
- Check internet connection

**More help:** Open browser console (F12) to see detailed errors

---

**Ready for advanced deployment?** See [DEPLOYMENT.md](DEPLOYMENT.md) for cloud options, Docker setup, and more!
