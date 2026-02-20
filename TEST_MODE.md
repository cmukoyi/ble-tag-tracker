# Test Mode Configuration 🧪

## Current Status: TESTING MODE ENABLED

The application is currently configured for testing with a hardcoded vehicle.

### Authentication ✅ NON-BLOCKING

**Important Change**: Authentication no longer blocks app startup!

**How it works:**
1. **Map loads immediately** - App initializes without waiting for authentication
2. **Background auth** - OAuth token fetch happens in the background (non-blocking)
3. **Graceful handling** - If auth fails (CORS error), app still works
4. **Manual fallback** - You can manually set a token if automatic auth fails

**What happens on startup:**
1. App displays loading screen briefly
2. Map initializes immediately (Google Maps or OpenStreetMap)
3. Loads saved vehicles from localStorage
4. Starts auto-refresh timer
5. **In background**: Attempts to fetch OAuth token
6. If token fetch succeeds → Test vehicle auto-loads after 1 second
7. If token fetch fails → Map still works, but you need to set token manually

**If you see CORS error in console:**
- This is expected when running from `file://` protocol
- See [GET_TOKEN.md](GET_TOKEN.md) for instructions to manually set a token
- Or run the app through a local web server (e.g., `python -m http.server`)

**Manual token setup (if needed):**
1. Run the Python script in [GET_TOKEN.md](GET_TOKEN.md)
2. Copy the token
3. Open browser console (F12)
4. Run: `authToken = "YOUR_TOKEN_HERE"`
5. Test vehicle will load automatically

### Test Vehicle Details

- **Vehicle ID**: `72753c0d-4202-4836-bf9a-aaa30fedefc4`
- **Vehicle Name**: "Chris Credit Card"
- **Location**: Clough Avenue, Trafford, M33 4HU (Manchester, UK)
- **Coordinates**: Latitude: 53.40807, Longitude: -2.34979
- **Ignition Status**: OFF
- **Event Type**: Heartbeat

### What's Hardcoded

1. **API URL** (in `js/map.js` - line ~200):
   ```javascript
   const url = 'https://live.mzoneweb.net/mzone62.api/LastKnownPositions?$format=json&$filter=vehicle_Id eq 72753c0d-4202-4836-bf9a-aaa30fedefc4';
   ```

2. **Auto-Load** (in `js/map.js` - line ~965):
   - The test vehicle automatically loads 1 second after page initialization
   - Displays as "Chris Credit Card" on the map

### Expected Behavior

When you open `index.html`:
1. Map loads centered on Manchester, UK
2. After 1 second, the test vehicle appears on the map
3. Vehicle marker shows in red (ignition OFF)
4. Clicking marker shows full vehicle details
5. Every 10 minutes, location refreshes automatically

### How to Test

1. Open `index.html` in a browser
2. Wait for map to load
3. Test vehicle "Chris Credit Card" should appear automatically
4. Try the menu features:
   - **My Tags** tab - View the vehicle card
   - **Admin** tab - Rename or delete the vehicle
   - **View on Map** - Center map on vehicle
   - **Select** - Choose vehicle for admin operations

### To Switch to Production Mode

Remove or comment out these sections in `js/map.js`:

1. **Line ~200** - Uncomment dynamic URL:
   ```javascript
   // REMOVE THIS:
   // const url = 'https://live.mzoneweb.net/mzone62.api/LastKnownPositions?$format=json&$filter=vehicle_Id eq 72753c0d-4202-4836-bf9a-aaa30fedefc4';
   
   // UNCOMMENT THIS:
   const url = CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.getLocation.replace(':imei', vehicleId);
   ```

2. **Line ~965** - Remove auto-load:
   ```javascript
   // REMOVE THIS ENTIRE BLOCK:
   setTimeout(() => {
       const testVehicleId = '72753c0d-4202-4836-bf9a-aaa30fedefc4';
       if (!trackedTags.has(testVehicleId)) {
           console.log('🧪 Auto-loading test vehicle: Chris Credit Card');
           addTag(testVehicleId, 'Chris Credit Card');
       }
   }, 1000);
   ```

### Test Checklist ✓

- [ ] Test vehicle loads automatically
- [ ] Marker appears at correct location (Manchester)
- [ ] Vehicle name displays as "Chris Credit Card"
- [ ] Ignition status shows OFF (red marker)
- [ ] Address shows "Clough Avenue, Trafford, M33 4HU"
- [ ] Event type shows "Heartbeat"
- [ ] My Tags tab displays vehicle card
- [ ] View on Map button centers map
- [ ] Select button highlights vehicle in admin
- [ ] Rename function updates vehicle name
- [ ] Delete function removes vehicle
- [ ] Auto-refresh runs every 10 minutes
- [ ] localStorage persists across page reloads

---

**Last Updated**: February 19, 2026  
**Test Vehicle Source**: mzone API - Live data feed
