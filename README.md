# BLE Tag Tracker 🏷️

A production-ready, mobile-first PWA for tracking BLE tags and vehicles in real-time with Google Maps/OpenStreetMap integration.

## 🚀 Production Deployment (NEW!)

**Ready to deploy?** This app is production-ready with enterprise features:

- ✅ OAuth credentials secured in environment variables
- ✅ Production/debug mode toggle
- ✅ Docker & Docker Compose support
- ✅ Cloud deployment ready (Heroku, Azure, AWS)
- ✅ Mobile network deployment
- ✅ Optimized performance

### Quick Deploy (15 minutes)

```powershell
# 1. Configure credentials
cd backend
copy .env.example .env
notepad .env  # Edit with your credentials

# 2. Deploy
.\DEPLOY_PRODUCTION.ps1  # Windows
# or
./deploy_production.sh   # Linux/Mac
# or
docker-compose up -d     # Docker
```

### 📖 Production Guides

- **[QUICKSTART.md](QUICKSTART.md)** - 15-minute deployment guide
- **[README_PRODUCTION.md](README_PRODUCTION.md)** - Complete production guide
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Step-by-step checklist  
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Advanced deployment options
- **[PRODUCTION_SUMMARY.md](PRODUCTION_SUMMARY.md)** - What changed for production

---

## Features ✨

- 🗺️ **Real-time Location Tracking** - View vehicle locations on interactive map
- 🌍 **Multiple Map Providers** - Choose between Google Maps or OpenStreetMap
- 📱 **Mobile-First PWA** - Install as app on mobile devices
- 🚗 **Live Vehicle Data** - Integrated with mzone API for real-time vehicle information
- 🎯 **Ignition Status** - Color-coded markers (Green = ON, Red = OFF)
- 📍 **Address Display** - Shows full address from API location data
- 📷 **QR Code Scanner** - Quickly add vehicles by scanning QR codes
- ⌨️ **Manual Entry** - Enter Vehicle ID (GUID) or IMEI manually
- 💾 **Persistent Storage** - Automatically saves your vehicles (localStorage)
- 🔄 **Auto-Refresh** - Automatic location updates every 10 minutes
- 🏷️ **Custom Names** - Edit vehicle descriptions for easy identification
- 🗑️ **Vehicle Management** - Remove individual vehicles or clear all at once
- 🔐 **Automatic OAuth** - Background authentication via secure backend
- 📊 **Trip History** - View and plot historical trip routes
- ⚙️ **Settings Panel** - Account management, devices, preferences
- 📴 **Offline Support** - Service worker for offline functionality

## Map Provider Configuration 🗺️

You can choose between **Google Maps** or **OpenStreetMap**:

**To use Google Maps** (default):
```javascript
// In js/map.js - CONFIG object
MAP_PROVIDER: 'google',
GOOGLE_MAPS_API_KEY: '',  // Optional - works without API key for testing
```

**To use OpenStreetMap** (free, no API key needed):
```javascript
// In js/map.js - CONFIG object
MAP_PROVIDER: 'osm',
```

**Google Maps Tile Types:**
- `roadmap` - Standard road map (default)
- `satellite` - Satellite imagery
- `hybrid` - Satellite with road overlay
- `terrain` - Terrain map

Change the tile type by modifying the lyrs parameter in `initMap()`:
- Roadmap: `lyrs=m`
- Satellite: `lyrs=s`
- Hybrid: `lyrs=y`
- Terrain: `lyrs=p`

## mzone API Integration 🔌

This app is configured to use the **mzone API** for vehicle tracking:

### API Configuration

```javascript
API_BASE_URL: 'https://live.mzoneweb.net/mzone62.api'
Endpoint: '/LastKnownPositions?$format=json&$filter=vehicle_Id eq [VEHICLE_ID]'
```

### Authentication ⚠️ IMPORTANT

The mzone API requires OAuth2 authentication with a **Bearer Token**. 

**⚠️ CORS Issue:** Due to browser security restrictions (CORS policy), the authentication endpoint cannot be called directly from the browser. The app handles this gracefully:

**How it works now:**
1. **App starts immediately** - Map loads without waiting for authentication
2. **Background authentication** - OAuth token is fetched in the background (non-blocking)
3. **Graceful degradation** - If authentication fails, the app still works but API calls will fail
4. **Manual token option** - You can manually set a token if needed (see below)

**If authentication fails due to CORS:**
1. Open browser console (F12)
2. Run this Python script to get a valid token:
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
   print(response.json()['access_token'])
   ```
3. Copy the token and paste in browser console:
   ```javascript
   authToken = "YOUR_TOKEN_HERE"
   tokenExpiration = Date.now() + 3600000  // 1 hour
   ```

**OAuth Credentials** (in `js/map.js`):
```javascript
CONFIG.OAUTH: {
    CLIENT_ID: 'mz-scopeuk',
    CLIENT_SECRET: 'g_SkQ.B.z3TeBU$g#hVeP#c2',
    USERNAME: 'ScopeUKAPI',
    PASSWORD: 'ScopeUKAPI01!',
    SCOPE: 'mz6-api.all mz_username',
    GRANT_TYPE: 'password'
}
```

**⚠️ Security Warning:**
These credentials are visible in the client-side JavaScript code. For production environments:
- **Recommended**: Use a backend proxy/server to handle authentication
- Store credentials server-side only
- Never expose client secrets in browser code

**Production Solution:**
Create a simple backend endpoint that:
1. Receives requests from your app
2. Authenticates with mzone API server-side
3. Returns the token to your app
4. This bypasses CORS and keeps credentials secure

### Expected API Response Format

```json
{
  "@odata.context": "https://live.mzoneweb.net/mzone62.api/$metadata#LastKnownPositions",
  "value": [{
    "vehicle_Id": "72753c0d-4202-4836-bf9a-aaa30fedefc4",
    "vehicle_Description": "Chris Credit Card",
    "utcTimestamp": "2026-02-19T20:07:42Z",
    "latitude": 53.40807,
    "longitude": -2.34979,
    "locationDescription": "Clough Avenue, Trafford, M33 4HU",
    "direction": 0.00,
    "eventType_Description": "Heartbeat",
    "ignitionOn": false,
    "vehicleDisabled": false
  }]
}
```

### Data Mapping

The app extracts and displays:
- **Vehicle Name**: `vehicle_Description` → "Chris Credit Card"
- **Location**: `latitude`, `longitude` → Map marker position
- **Address**: `locationDescription` → "Clough Avenue, Trafford, M33 4HU"
- **Ignition Status**: `ignitionOn` → Marker color (Green/Red) and status badge
- **Event Type**: `eventType_Description` → "Heartbeat", "Journey Start", etc.
- **Timestamp**: `utcTimestamp` → "Last Updated" time

## Project Structure 📁

```
bleTags/
├── index.html          # Main HTML page
├── css/
│   └── style.css       # Mobile-first CSS styling
├── js/
│   ├── map.js          # Map management & API integration
│   └── scanner.js      # QR code scanning logic
└── README.md           # Documentation (this file)
```

## Quick Start 🚀

### 1. **Open the App**

Simply open `index.html` in a web browser:

```bash
# Using Python's built-in server (recommended for testing)
cd C:\Users\Carlos Mukoyi\Documents\code\FunTools\bleTags
python -m http.server 8000

# Then open: http://localhost:8000
```

Or use any static file server:
- **VS Code Live Server Extension**
- **Node.js `http-server`**: `npx http-server`
- **PHP**: `php -S localhost:8000`

### 2. **Test with Sample Vehicle**

Try the test page first:
- Open `test_vehicle.html` for step-by-step instructions
- Test Vehicle ID: `72753c0d-4202-4836-bf9a-aaa30fedefc4`
- Expected result: Vehicle "Chris Credit Card" plotted in Manchester, UK

### 3. **Add a Vehicle**

Two ways to add vehicles:

1. **Scan QR Code**
   - Click the blue + button
   - Click "Scan QR Code"
   - Grant camera permissions
   - Scan QR code containing Vehicle ID or IMEI

2. **Manual Entry**
   - Click the blue + button
   - Enter Vehicle ID (GUID format like `72753c0d-4202-4836-bf9a-aaa30fedefc4`)
   - Or enter 15-digit IMEI
   - Click "Add"

### 4. **Manage Your Saved Vehicles**

Your vehicles are automatically saved to your browser's localStorage and will persist across sessions.

**View Saved Vehicles:**
- Click the menu button (☰) in the top right
- See a list of all your saved vehicles
- Click any vehicle to center the map on it

**Edit Vehicle Name:**
- Click a marker on the map to open the info panel
- Click the pencil ✏️ icon next to the vehicle name
- Enter a custom name (e.g., "Company Car", "Delivery Van")
- Press Enter or click ✓ to save

**Remove a Single Vehicle:**
- Method 1: In the saved vehicles list, click the trash icon next to a vehicle
- Method 2: Click a marker on the map, then click "Remove Tag" in the info panel

**Clear All Vehicles:**
- Click the menu button (☰)
- Click "Clear All Tags" at the bottom
- Confirm to remove all tracked vehicles

**Auto-Load on Refresh:**
- All saved vehicles automatically load when you open the app
- No need to re-add tags after closing the browser

## Backend API Requirements 🔌

Your backend API must provide the following endpoints:

### **GET** `/api/tags/:imei/location`

Fetch location data for a specific tag.

**Response:**
```json
{
  "imei": "868695060734355",
  "latitude": -26.2041,
  "longitude": 28.0473,
  "timestamp": "2026-02-19T10:30:00Z",
  "battery": 85,
  "address": "Sandton, Johannesburg"
}
```

### **GET** `/api/tags`

Fetch all tracked tags.

**Response:**
```json
{
  "tags": [
    {
      "imei": "868695060734355",
      "latitude": -26.2041,
      "longitude": 28.0473,
      "timestamp": "2026-02-19T10:30:00Z",
      "battery": 85
    }
  ]
}
```

### **POST** `/api/tags`

Add a new tag to be tracked.

**Request:**
```json
{
  "imei": "868695060734355"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tag added successfully"
}
```

## QR Code Formats Supported 📷

The app can extract IMEI from various QR code formats:

1. **MHub Format**: `MHub369F:IMEI868695060772926:MAC00:11:22:33:44:55`
2. **Plain IMEI**: `868695060734355`
3. **JSON**: `{"imei": "868695060734355", "name": "Tag 1"}`
4. **Key-Value**: `imei=868695060734355`
5. **URL**: `https://example.com/imei/868695060734355`

## Configuration Options ⚙️

Edit `js/map.js` to customize:

```javascript
const CONFIG = {
    // API Settings
    API_BASE_URL: 'http://localhost:5000/api',
    
    // Map Settings
    DEFAULT_CENTER: [-26.2041, 28.0473],  // [Latitude, Longitude]
    DEFAULT_ZOOM: 13,
    
    // Auto-refresh interval (milliseconds)
    REFRESH_INTERVAL: 30000,  // 30 seconds
    
    // LocalStorage Settings
    STORAGE_KEY: 'bleTracker_savedTags',  // Change to use different storage key
};
```

**LocalStorage Details:**
- Tags are saved automatically when added
- Storage key: `bleTracker_savedTags` (customizable)
- Data format: Array of IMEI strings
- Tags persist across browser sessions
- Clearing browser data will remove saved tags

## Development Mode (Mock Data) 🧪

The app includes mock data generation for testing without a backend:

- Automatically generates random locations near Johannesburg
- Random battery levels (60-100%)
- Current timestamps

**To disable mock data:** Update the `fetchTagLocation()` function in `js/map.js`:

```javascript
async function fetchTagLocation(imei) {
    try {
        const url = CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.getLocation.replace(':imei', imei);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch location for ${imei}:`, error);
        throw error;  // ← Remove mock data fallback
    }
}
```

## Browser Requirements 📱

### **Desktop**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### **Mobile**
- iOS Safari 14+
- Chrome for Android 90+
- Samsung Internet 14+

### **Required Features**
- JavaScript enabled
- Camera access (for QR scanning)
- Geolocation API (optional, for user location)

## Deployment 🌐

### **Static Hosting Options:**

1. **GitHub Pages**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/ble-tracker.git
   git push -u origin main
   # Enable GitHub Pages in repo settings
   ```

2. **Netlify**
   - Drag and drop the `bleTags` folder
   - Or connect to GitHub repo

3. **Vercel**
   ```bash
   npm i -g vercel
   vercel
   ```

4. **AWS S3 + CloudFront**

5. **Azure Static Web Apps**

## Security Considerations 🔒

1. **HTTPS Required** - Camera access requires HTTPS (except localhost)
2. **CORS** - Ensure your backend allows requests from your frontend domain
3. **API Authentication** - Add API keys/tokens if needed (not implemented by default)
4. **Input Validation** - IMEI validation is basic, enhance if needed

## Troubleshooting 🔧

### **Camera not working?**
- Ensure HTTPS is enabled (or use localhost)
- Check browser permissions
- Try a different browser

### **Map not loading?**
- Check internet connection
- Open browser console (F12) for errors
- Ensure Leaflet JS/CSS CDN is accessible

### **API errors?**
- Check `CONFIG.API_BASE_URL` is correct
- Verify backend is running
- Check CORS settings on backend
- Open Network tab in browser DevTools

### **Markers not appearing?**
- Check API response format matches expected structure
- Verify latitude/longitude values are valid
- Check browser console for errors

## Customization 🎨

### **Change Map Style**

Replace OpenStreetMap with other tile providers:

```javascript
// In map.js initMap() function
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    // ... options
}).addTo(map);
```

**Alternatives:**
- **CartoDB**: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`
- **Stamen**: `https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png`
- **Google Maps**: Requires API key and additional library

### **Change Marker Icon**

Edit `addOrUpdateMarker()` in `js/map.js`:

```javascript
const markerIcon = L.divIcon({
    className: 'custom-marker',
    html: `<i data-lucide="your-icon-name"></i>`,
    // ... other options
});
```

See [Lucide Icons](https://lucide.dev/icons/) for available icons.

## Performance Tips ⚡

1. **Reduce Refresh Interval** for fewer API calls
2. **Limit Tracked Tags** - Too many markers can slow down the map
3. **Use Marker Clustering** - For 50+ tags, consider [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)
4. **Optimize Images** - If using custom marker images
5. **Lazy Load** - Load tags on-demand instead of all at once

## License 📄

This project is provided as-is for educational and commercial use.

## Support 💬

For issues or questions:
1. Check the browser console for errors
2. Review this README
3. Check Leaflet.js documentation: https://leafletjs.com/
4. Check jsQR documentation: https://github.com/cozmo/jsQR

## Credits 🙏

- **Leaflet.js** - Interactive map library
- **OpenStreetMap** - Map tiles
- **jsQR** - QR code scanning
- **Tailwind CSS** - Styling framework
- **Lucide Icons** - Icon library

---

**Created for tracking BLE tags with a simple, mobile-first interface.**
