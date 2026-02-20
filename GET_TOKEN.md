# How to Get Authentication Token (CORS Workaround)

## The Problem

The mzone authentication server blocks browser requests due to CORS (Cross-Origin Resource Sharing) policy. This is a security feature that prevents unauthorized cross-domain requests.

## Quick Solution: Manual Token

Since the OAuth endpoint can't be called from the browser, use Python to get a token:

### Step 1: Run this Python script

```python
import requests

url = "https://login.mzoneweb.net/connect/token"

params = {
    'client_id': 'mz-scopeuk',
    'client_secret': 'g_SkQ.B.z3TeBU$g#hVeP#c2',
    'username': 'ScopeUKAPI',
    'password': 'ScopeUKAPI01!',
    'scope': 'mz6-api.all mz_username',
    'grant_type': 'password',
    'response_type': 'code id_token'
}

response = requests.post(url, data=params)
token_data = response.json()

print(f"Access Token: {token_data['access_token']}")
print(f"Expires in: {token_data['expires_in']} seconds ({token_data['expires_in']/60} minutes)")
```

### Step 2: Copy the token

The script will output something like:
```
Access Token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjlDNTg1RjFFODkzM...
Expires in: 3600 seconds (60.0 minutes)
```

### Step 3: Set the token in your browser

1. Open the Vehicle Tracker app in your browser
2. Open DevTools Console (F12)
3. Paste this command with your token:

```javascript
authToken = "YOUR_TOKEN_HERE"
tokenExpiration = Date.now() + 3600000  // 1 hour from now
console.log("✅ Token manually set! API calls should now work.")
```

### Step 4: Test it

Add a vehicle or click "View on Map" for an existing vehicle. If you see location data in the console, it's working!

## Permanent Solution: Use a Backend Proxy

For production, create a simple backend server that:

1. **Receives requests from your app** → `https://your-server.com/api/token`
2. **Calls mzone auth server** → Gets token server-side (no CORS issues)
3. **Returns token to your app** → Your app uses it for API calls

### Example: Simple Node.js Proxy

```javascript
// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());  // Allow requests from your frontend

app.get('/api/token', async (req, res) => {
    try {
        const response = await axios.post('https://login.mzoneweb.net/connect/token', new URLSearchParams({
            client_id: 'mz-scopeuk',
            client_secret: 'g_SkQ.B.z3TeBU$g#hVeP#c2',
            username: 'ScopeUKAPI',
            password: 'ScopeUKAPI01!',
            scope: 'mz6-api.all mz_username',
            grant_type: 'password',
            response_type: 'code id_token'
        }));
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Proxy running on http://localhost:3000'));
```

Then update `CONFIG.OAUTH.TOKEN_URL` to `http://localhost:3000/api/token`

## Why This Happens

- **CORS** is a browser security feature
- The mzone login server doesn't allow requests from `file://` or other origins
- Python/Postman/backend servers don't have CORS restrictions
- This is intentional security design (prevents malicious websites from stealing tokens)

## Current App Behavior

✅ **Map loads immediately** - No waiting for authentication  
✅ **Background auth attempt** - Tries to get token automatically  
⚠️ **Graceful failure** - If CORS blocks it, app still works (you set token manually)  
✅ **Auto-retry** - App will retry auth on next refresh  

The app is designed to work with or without automatic authentication!
