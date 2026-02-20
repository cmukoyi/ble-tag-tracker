# 🚀 Quick Start - Vehicle Tracker

## ✅ What Was Fixed

The **CORS architecture problem** is now solved! 

### Before (Broken)
```
Browser → login.mzoneweb.net ❌ CORS ERROR
```

### After (Working)
```
Browser → Flask Backend → login.mzoneweb.net ✅ NO CORS
```

---

## 🏃 How to Run (3 Simple Steps)

### Step 1: Start the Backend
```powershell
cd "C:\Users\Carlos Mukoyi\Documents\code\FunTools\bleTags"
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
 * Running on http://0.0.0.0:5000
```

### Step 2: Open Browser
Navigate to: **http://localhost:5000**

### Step 3: Enjoy!
- ✅ Token automatically fetched (no CORS errors!)
- ✅ Test vehicle auto-loads (Chris Credit Card)
- ✅ Token auto-refreshes every 55 minutes
- ✅ No manual Python scripts needed!

---

## 🎉 What You'll See (Console)

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
✅ OAuth token obtained successfully
🔑 Token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjlDNTg1RjFFODk...
⏰ Token expires in: 3600 seconds (60 minutes)
📅 Token valid until: 3:45:23 PM
⏰ Token will auto-refresh in 55 minutes
✅ Authentication successful - API calls will now work
🔄 Automatic token refresh scheduled
🧪 Auto-loading test vehicle: Chris Credit Card
```

---

## 🛑 How to Stop

Press `Ctrl + C` in the PowerShell terminal where the server is running.

---

## 📁 Project Structure

```
bleTags/
├── index.html              # Frontend UI
├── css/
│   └── styles.css
├── js/
│   └── map.js              # Frontend logic (calls localhost:5000)
├── backend/                # NEW! Flask server
│   ├── app.py              # Backend API (handles OAuth)
│   └── requirements.txt
├── START_SERVER.ps1        # Quick start script
└── QUICK_START.md          # This file
```

---

## ✅ Backend API (Automatic)

Your frontend automatically calls:

```
GET http://localhost:5000/api/token
```

Backend response:
```json
{
  "success": true,
  "access_token": "eyJhbGci...",
  "expires_in": 3600,
  "cached": false
}
```

Backend then calls:
```
POST https://login.mzoneweb.net/connect/token
```

**No CORS!** ✅ The OAuth server allows server-side requests.

---

## 🎯 Summary

✅ **One command:** `.\START_SERVER.ps1`  
✅ **One URL:** http://localhost:5000  
✅ **Zero CORS errors**  
✅ **Automatic tokens**  
✅ **Ready to use!**

**Enjoy your working Vehicle Tracker!** 🚗🗺️
