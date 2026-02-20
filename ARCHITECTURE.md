# 🏗️ Vehicle Tracker - Correct Architecture

## ❌ What Was Wrong Before

```
Browser (http://localhost:8000)
   ↓ [CORS BLOCKED! ❌]
login.mzoneweb.net/connect/token
```

**Problem:** Browsers enforce CORS (Cross-Origin Resource Sharing). The OAuth endpoint at `login.mzoneweb.net` does NOT allow requests from browsers. This is a **security feature** that cannot be bypassed from the client side.

---

## ✅ Correct Architecture (What We Have Now)

```
Browser (http://localhost:5000)
   ↓
Flask Backend (http://localhost:5000/api/token)
   ↓ [No CORS restrictions on server-side ✅]
login.mzoneweb.net/connect/token
```

**Why This Works:**
1. **Browser → Backend:** Same origin (both localhost:5000), no CORS issues
2. **Backend → OAuth Server:** Server-side requests don't have CORS restrictions
3. **Token Cached:** Backend caches the token for up to 55 minutes

---

## 🚀 How to Run

### Option 1: Quick Start (Recommended)

```powershell
# From the bleTags folder
.\START_SERVER.ps1
```

This script will:
- ✅ Create Python virtual environment (if needed)
- ✅ Install dependencies (Flask, flask-cors, requests)
- ✅ Start the Flask backend server
- ✅ Serve the app at http://localhost:5000

### Option 2: Manual Start

```powershell
# Navigate to backend folder
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies (first time only)
pip install -r requirements.txt

# Start server
python app.py
```

Then open: **http://localhost:5000**

---

## 📁 New File Structure

```
bleTags/
├── index.html              # Frontend UI
├── css/
│   └── styles.css          # Styling
├── js/
│   └── map.js              # Frontend logic (UPDATED ✅)
├── backend/                # NEW! Backend server
│   ├── app.py              # Flask server
│   ├── requirements.txt    # Python dependencies
│   └── venv/               # Python virtual environment (auto-created)
├── START_SERVER.ps1        # Quick start script (NEW ✅)
└── get_token.py            # OLD - No longer needed!
```

---

## 🔑 How Token Management Works Now

### 1. App Loads
```javascript
// Browser calls LOCAL backend (no CORS)
fetch('http://localhost:5000/api/token')
```

### 2. Backend Fetches Token
```python
# Backend calls OAuth server (no CORS restrictions)
requests.post('https://login.mzoneweb.net/connect/token', ...)
```

### 3. Backend Caches Token
```python
# Token stored in memory
token_cache = {
    'token': 'eyJhbGciOiJSUzI1NiIsImtpZCI...',
    'expires_at': datetime.now() + timedelta(seconds=3600)
}
```

### 4. Subsequent Calls Use Cached Token
- If token is still valid (not expired): Return cached token
- If token expires in < 5 minutes: Fetch new token
- Auto-refresh every ~55 minutes

---

## 🌐 API Endpoints

### Frontend Endpoint
```
GET http://localhost:5000/
→ Serves index.html
```

### Token API Endpoint
```
GET http://localhost:5000/api/token

Response (Success):
{
  "success": true,
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlDNTg1RjFFODk...",
  "expires_in": 3600,
  "cached": false
}

Response (Error):
{
  "success": false,
  "error": "Token request failed: 401",
  "details": "Invalid credentials"
}
```

### Health Check
```
GET http://localhost:5000/api/health

Response:
{
  "status": "healthy",
  "token_cached": true,
  "token_expires_at": "2026-02-20T15:45:23.123456"
}
```

---

## 🔄 Token Refresh Flow

```
App Loads
   ↓
GET /api/token (no token cached)
   ↓
Backend fetches from OAuth server
   ↓
Token cached for 55 minutes
   ↓
Frontend schedules refresh timer
   ↓
After 55 minutes...
   ↓
Frontend calls GET /api/token
   ↓
Backend checks cache (expired)
   ↓
Backend fetches new token
   ↓
Repeat cycle ♻️
```

---

## 📊 Console Output Examples

### When Backend is Running (Success)
```
🚀 Initializing Vehicle Tracker...
🗺️ Step 1: Initializing map...
✅ Map initialized
📦 Step 2: Loading saved tags from storage...
✅ Saved tags loaded
🔄 Step 3: Starting auto-refresh...
✅ Vehicle Tracker initialized successfully
🔐 Step 4: Authenticating with backend server (background)...
⏱️  Token will auto-refresh every ~55 minutes
✅ Authentication successful - API calls will now work
🔄 Automatic token refresh scheduled
```

### When Backend is NOT Running (Error)
```
🔐 Step 4: Authenticating with backend server (background)...
⏱️  Token will auto-refresh every ~55 minutes
❌ Failed to fetch OAuth token from backend: TypeError: Failed to fetch
🚨 BACKEND CONNECTION ERROR
💡 SOLUTION: Make sure the backend server is running!
   Run: START_SERVER.ps1
   Or: cd backend && python app.py
╔════════════════════════════════════════════════════════╗
║  🚨 BACKEND SERVER NOT RUNNING                         ║
╠════════════════════════════════════════════════════════╣
║  Start the backend server first:                       ║
║  1. Open PowerShell                                    ║
║  2. Run: .\START_SERVER.ps1                            ║
║  3. Then open: http://localhost:5000                   ║
╚════════════════════════════════════════════════════════╝
```

---

## ✅ Testing the Setup

### 1. Start Backend
```powershell
.\START_SERVER.ps1
```

Expected output:
```
============================================================
🚀 Vehicle Tracker Backend Server
============================================================
📱 Frontend: http://localhost:5000
🔑 Token API: http://localhost:5000/api/token
❤️  Health Check: http://localhost:5000/api/health
============================================================
✅ Server starting...

 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://0.0.0.0:5000
```

### 2. Open Browser
Navigate to: **http://localhost:5000**

### 3. Check Console (F12)
You should see:
```
✅ Authentication successful - API calls will now work
```

### 4. Test Vehicle Loading
Click "View on Map" on the test vehicle (Chris Credit Card)

Expected result:
- ✅ Vehicle appears on map
- ✅ No CORS errors
- ✅ Location data shows in info panel

---

## 🆚 Comparison: Before vs After

| Feature | Before (Static HTML) | After (Flask Backend) |
|---------|---------------------|----------------------|
| **Architecture** | Browser → OAuth endpoint | Browser → Backend → OAuth |
| **CORS Issues** | ❌ Always blocked | ✅ No CORS |
| **Token Fetch** | ❌ Failed | ✅ Automatic |
| **Manual Steps** | Run Python script, paste token | None! Just start server |
| **Token Refresh** | ⚠️ Manual every hour | ✅ Automatic every 55 min |
| **Credentials** | ⚠️ Exposed in JS | ✅ Hidden in backend |
| **Production Ready** | ❌ No | ✅ Yes (with small changes) |

---

## 🎯 Key Benefits

1. **✅ No CORS Errors:** Backend handles OAuth, browser calls localhost
2. **✅ Automatic Token Management:** Backend caches and refreshes tokens
3. **✅ Secure Credentials:** OAuth credentials hidden in backend (not in browser JS)
4. **✅ Simple Startup:** One command (`START_SERVER.ps1`)
5. **✅ Production Path:** Easy to deploy (add HTTPS, env vars, etc.)

---

## 🔐 Security Notes

### Development (Current Setup)
- Backend runs on localhost:5000
- Credentials hardcoded in `backend/app.py`
- **Suitable for:** Local testing only

### Production Deployment
Move credentials to environment variables:

```python
# backend/app.py
import os

CLIENT_ID = os.environ.get('OAUTH_CLIENT_ID')
CLIENT_SECRET = os.environ.get('OAUTH_CLIENT_SECRET')
USERNAME = os.environ.get('OAUTH_USERNAME')
PASSWORD = os.environ.get('OAUTH_PASSWORD')
```

Then set environment variables:
```powershell
$env:OAUTH_CLIENT_ID = "mz-scopeuk"
$env:OAUTH_CLIENT_SECRET = "your-secret-here"
$env:OAUTH_USERNAME = "ScopeUKAPI"
$env:OAUTH_PASSWORD = "your-password-here"
```

---

## 🐛 Troubleshooting

### "Connection refused" / Can't reach localhost:5000
**Problem:** Backend server not running

**Solution:**
```powershell
.\START_SERVER.ps1
```

### "Module not found: flask"
**Problem:** Dependencies not installed

**Solution:**
```powershell
cd backend
pip install -r requirements.txt
```

### "Token request failed: 401"
**Problem:** Invalid OAuth credentials

**Solution:** Check credentials in `backend/app.py` (lines 12-15)

### CORS errors still appearing
**Problem:** Opening HTML file directly (file://) instead of through backend

**Solution:** Always use **http://localhost:5000** (not file:// paths)

---

## 📝 Summary

✅ **CORS Problem Solved:** Backend acts as proxy
✅ **Automatic Tokens:** No manual Python scripts needed
✅ **One Command:** Just run `START_SERVER.ps1`
✅ **Secure:** Credentials hidden from browser
✅ **Production Ready:** Easy to deploy with env vars

**Next Steps:**
1. Run: `.\START_SERVER.ps1`
2. Open: http://localhost:5000
3. Enjoy! 🎉
