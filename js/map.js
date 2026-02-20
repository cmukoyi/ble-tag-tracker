// BLE Tag Tracker - Map Management & API Integration
// Uses Leaflet.js with OpenStreetMap

// ===== CONFIGURATION =====
const CONFIG = {
    // Production mode flag (set to false to enable debug logging)
    PRODUCTION: true,
    
    // Backend URL (auto-detects host for mobile access)
    BACKEND_URL: `${window.location.protocol}//${window.location.hostname}:5000`,
    
    // API Configuration - mzone API
    API_BASE_URL: 'https://live.mzoneweb.net/mzone62.api',
    API_ENDPOINTS: {
        getLocation: '/LastKnownPositions?$format=json&$filter=vehicle_Id eq :imei',  // GET - Fetch vehicle location by ID
        getAllTags: '/tags',                      // GET - Fetch all tags
        addTag: '/tags',                          // POST - Add new tag
    },
    
    // Map Configuration
    MAP_PROVIDER: 'google',  // 'osm' for OpenStreetMap, 'google' for Google Maps
    GOOGLE_MAPS_API_KEY: '',  // Add your Google Maps API key here if available
    DEFAULT_CENTER: [53.40807, -2.34979],  // Manchester, UK
    DEFAULT_ZOOM: 13,
    MAX_ZOOM: 19,
    MIN_ZOOM: 3,
    
    // Refresh Interval (milliseconds)
    REFRESH_INTERVAL: 600000,  // 10 minutes
    
    // LocalStorage Configuration
    STORAGE_KEY: 'bleTracker_savedTags',  // Key for localStorage
};

// Debug logging helper
function debugLog(...args) {
    if (!CONFIG.PRODUCTION) {
        debugLog(...args);
    }
}

function debugError(...args) {
    if (!CONFIG.PRODUCTION) {
        debugError(...args);
    }
}

// ===== STATE MANAGEMENT =====
let map = null;
let markers = {};  // Store markers by IMEI
let trackedTags = new Map();  // Map of IMEI -> {imei, description}
let refreshTimer = null;
let selectedTag = null;
let selectedVehicleForAdmin = null;  // Track selected vehicle in admin panel
let currentTripPolyline = null;  // Polyline for currently displayed trip route
let currentTripMarkers = [];  // Markers for currently displayed trip route

// OAuth Token State
let authToken = null;
let tokenExpiration = null;
let tokenRefreshTimer = null;  // Timer to refresh token before expiration

// ===== AUTHENTICATION =====

/**
 * Fetch a new OAuth token from LOCAL BACKEND SERVER (bypasses CORS)
 * Backend handles OAuth communication with login.mzoneweb.net
 */
async function fetchAuthToken() {
    try {
        // Call LOCAL backend API instead of external OAuth endpoint
        // This bypasses CORS because browser → backend has no CORS restrictions
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/token`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`OAuth Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Store token and calculate expiration time
        authToken = data.access_token;
        const expiresInSeconds = data.expires_in || 3600;  // Usually 3600 (1 hour)
        
        // Set expiration time
        tokenExpiration = Date.now() + (expiresInSeconds * 1000);
        
        // Token obtained successfully - removed sensitive logging
        
        // Schedule automatic token refresh 5 minutes before expiration
        scheduleTokenRefresh(expiresInSeconds);
        
        return authToken;
    } catch (error) {
        console.error('❌ Failed to fetch OAuth token from backend:', error);
        debugError('🚨 BACKEND CONNECTION ERROR');
        debugError('💡 SOLUTION: Make sure the backend server is running!');
        debugError('   Run: START_SERVER.ps1');
        debugError('   Or: cd backend && python app.py');
        throw error;
    }
}

/**
 * Schedule automatic token refresh before expiration
 * @param {number} expiresInSeconds - Token lifetime in seconds
 */
function scheduleTokenRefresh(expiresInSeconds) {
    // Clear existing timer
    if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
    }
    
    // Refresh 5 minutes (300 seconds) before expiration
    const refreshInMs = Math.max((expiresInSeconds - 300) * 1000, 60000); // At least 1 minute
    
    tokenRefreshTimer = setTimeout(async () => {
        // Auto-refreshing token
        try {
            await fetchAuthToken();
        } catch (error) {
            console.error('❌ Token auto-refresh failed');
        }
    }, refreshInMs);
}

/**
 * Get a valid OAuth token (fetch new one if expired)
 * Returns existing token if still valid, otherwise fetches new one
 */
async function getValidToken() {
    // Check if token exists and is not expired (with 60 second buffer)
    const buffer = 60 * 1000; // 60 seconds
    if (!authToken || !tokenExpiration || Date.now() >= (tokenExpiration - buffer)) {
        await fetchAuthToken();
    }
    
    return authToken;
}

/**
 * Manually set OAuth token (for use from browser console)
 * Usage: setToken("YOUR_TOKEN_HERE", 3600)
 * @param {string} token - The Bearer token
 * @param {number} expiresInSeconds - Token lifetime in seconds (default: 3600)
 */
function setToken(token, expiresInSeconds = 3600) {
    authToken = token;
    tokenExpiration = Date.now() + (expiresInSeconds * 1000);
    
    // Token set manually - removed sensitive logging
    
    // Schedule auto-refresh
    scheduleTokenRefresh(expiresInSeconds);
}

// ===== LOCAL STORAGE FUNCTIONS =====

/**
 * Load saved tags from localStorage
 */
function loadSavedTags() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (saved) {
            const tags = JSON.parse(saved);
            debugLog(`📦 Loading ${tags.length} saved tags from localStorage`);
            
            tags.forEach(tag => {
                const imei = tag.imei || tag;  // Support old format (plain string)
                const description = tag.description || 'BLE Tag';
                
                trackedTags.set(imei, { imei, description });
                
                // Fetch and display each saved tag
                fetchTagLocation(imei).then(tagData => {
                    if (tagData) {
                        tagData.description = description;  // Add description to tag data
                        addOrUpdateMarker(tagData);
                    } else {
                        debugError(`Failed to load saved tag ${imei}: API returned no data`);
                    }
                }).catch(error => {
                    debugError(`Failed to load saved tag ${imei}:`, error);
                });
            });
            
            debugLog(`✅ Loaded ${tags.length} saved tags`);
        } else {
            debugLog('📦 No saved tags found');
        }
    } catch (error) {
        debugError('Failed to load saved tags:', error);
    }
}

/**
 * Load saved tags from localStorage WITHOUT fetching their locations
 * This is used during initialization to avoid blocking the UI
 */
function loadSavedTagsWithoutFetch() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (saved) {
            const tags = JSON.parse(saved);
            debugLog(`📦 Loading ${tags.length} saved tags from localStorage (without API fetch)`);
            
            tags.forEach(tag => {
                const imei = tag.imei || tag;  // Support old format (plain string)
                const description = tag.description || 'BLE Tag';
                
                trackedTags.set(imei, { imei, description });
            });
            
            debugLog(`✅ Loaded ${tags.length} saved tags into memory`);
            
            // Update the UI to show the tags (without markers on map yet)
            updateSavedTagsList();
        } else {
            debugLog('📦 No saved tags found');
        }
    } catch (error) {
        debugError('Failed to load saved tags:', error);
    }
}

/**
 * Save tracked tags to localStorage
 */
function saveTags() {
    try {
        const tags = Array.from(trackedTags.values());
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(tags));
        debugLog(`💾 Saved ${tags.length} tags to localStorage`);
    } catch (error) {
        debugError('Failed to save tags:', error);
    }
}

/**
 * Update tag description
 */
function updateTagDescription(imei, description) {
    if (trackedTags.has(imei)) {
        trackedTags.set(imei, { imei, description });
        saveTags();
        
        // Update marker popup if exists
        if (markers[imei]) {
            const marker = markers[imei];
            marker.getPopup().setContent(`
                <div class="p-2">
                    <p class="font-bold text-gray-800">${description}</p>
                </div>
            `);
        }
        
        debugLog(`✏️ Updated description for ${imei}: ${description}`);
        return true;
    }
    return false;
}

/**
 * Remove a tag from tracking and localStorage
 */
function removeTag(imei) {
    if (trackedTags.has(imei)) {
        trackedTags.delete(imei);
        removeMarker(imei);
        saveTags();
        debugLog(`🗑️ Removed tag: ${imei}`);
        return true;
    }
    return false;
}

/**
 * Clear all saved tags
 */
function clearAllTags() {
    if (confirm('Are you sure you want to remove all tracked tags?')) {
        trackedTags.forEach((tag, imei) => removeMarker(imei));
        trackedTags.clear();
        saveTags();
        debugLog('🗑️ All tags cleared');
    }
}

// ===== API VEHICLE FUNCTIONS =====

/**
 * Fetch all vehicles from API
 */
async function fetchVehicles() {
    try {
        const token = await getValidToken();
        if (!token) {
            throw new Error('No authentication token available');
        }
        
        const apiUrl = 'https://live.mzoneweb.net/mzone62.api/Vehicles?$format=json&$count=true&$select=id%2Cdescription%2CvehicleIcon%2CvehicleIconColor%2ClastKnownEventUtcLastModified%2CdisablementFeatureAvailable%2CignitionOn%2Cregistration%2ClastKnownEventUtcTimestamp%2ClastKnownGpsEventUtcTimestamp%2CdecimalOdometer%2CengineSeconds%2Cvin%2Cunit_Description%2CvehicleDisabled&$orderby=description&$skip=0&$top=1000&vehicleGroup_Id=8e4fe3a7-4d46-474d-bf57-993828f70968&$expand=lastKnownPosition(%24select%3Dlongitude%2Clatitude%2CeventType_Id%2CutcTimestamp%2Cspeed)%2ClastKnownTemperature(%24select%3DutcTimestamp)%2CvehicleType(%24select%3DvehicleNotReportedThreshold)%2Cmake(%24select%3Ddescription)%2Cmodel(%24select%3Ddescription)%2ClastKnownFuelConsumption(%24select%3DaverageConsumption%2CaverageConsumptionUtcTimestamp%2CinstantaneousConsumption%2CinstantaneousConsumptionUtcTimestamp)%2ClastKnownFuelLevel(%24select%3Dlevel%2Cpercentage%2CutcTimestamp)';
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        debugLog(`✅ Fetched ${data.value?.length || 0} vehicles from API`);
        return data.value || [];
    } catch (error) {
        debugError('❌ Failed to fetch vehicles:', error);
        return [];
    }
}

// ===== MAP INITIALIZATION =====
function initMap() {
    // Initialize Leaflet map
    map = L.map('map', {
        center: CONFIG.DEFAULT_CENTER,
        zoom: CONFIG.DEFAULT_ZOOM,
        zoomControl: false,  // Disable default zoom control (will add on right)
        maxZoom: CONFIG.MAX_ZOOM,
        minZoom: CONFIG.MIN_ZOOM,
    });

    // Add zoom control on the right side
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Define base layers for layer control
    const baseLayers = {};

    // Google Maps - Roadmap (Standard)
    const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
        maxZoom: CONFIG.MAX_ZOOM,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // Google Maps - Satellite
    const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
        maxZoom: CONFIG.MAX_ZOOM,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // Google Maps - Hybrid (Satellite with labels)
    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
        maxZoom: CONFIG.MAX_ZOOM,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // Google Maps - Terrain
    const googleTerrain = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
        maxZoom: CONFIG.MAX_ZOOM,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // OpenStreetMap (fallback option)
    const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: CONFIG.MAX_ZOOM,
    });

    // Add layers to baseLayers object
    baseLayers['Roadmap'] = googleRoadmap;
    baseLayers['Satellite'] = googleSatellite;
    baseLayers['Hybrid'] = googleHybrid;
    baseLayers['Terrain'] = googleTerrain;
    baseLayers['OpenStreetMap'] = osmStandard;

    // Add default layer (Roadmap)
    googleRoadmap.addTo(map);

    // Add layer control to switch between map types
    L.control.layers(baseLayers, null, {
        position: 'topright',
        collapsed: true
    }).addTo(map);

    // Add custom home button control - Find my location
    const HomeControl = L.Control.extend({
        options: {
            position: 'topright'
        },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.backgroundSize = '20px 20px';
            container.style.width = '30px';
            container.style.height = '30px';
            container.style.cursor = 'pointer';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.title = 'Find my location';
            container.innerHTML = '<i data-lucide="home" style="width: 18px; height: 18px; color: #333;"></i>';
            
            container.onclick = function() {
                map.locate({setView: true, maxZoom: 16});
            };
            
            // Re-initialize Lucide icons for the new icon
            setTimeout(() => lucide.createIcons(), 100);
            
            return container;
        }
    });
    map.addControl(new HomeControl());

    // Add custom tag location button control - Go to tags/default view
    const LocationControl = L.Control.extend({
        options: {
            position: 'topright'
        },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.backgroundSize = '20px 20px';
            container.style.width = '30px';
            container.style.height = '30px';
            container.style.cursor = 'pointer';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.title = 'Go to tags view';
            container.innerHTML = '<i data-lucide="crosshair" style="width: 18px; height: 18px; color: #333;"></i>';
            
            container.onclick = function() {
                map.setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM, {
                    animate: true,
                    duration: 1
                });
            };
            
            // Re-initialize Lucide icons for the new icon
            setTimeout(() => lucide.createIcons(), 100);
            
            return container;
        }
    });
    map.addControl(new LocationControl());

    // Add geolocation control
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    debugLog('✅ Map initialized');
}

// ===== USER LOCATION =====
function onLocationFound(e) {
    const radius = e.accuracy / 2;
    
    L.marker(e.latlng, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<i data-lucide="navigation" style="color: white; width: 16px; height: 16px;"></i>',
            iconSize: [30, 30],
        })
    })
    .addTo(map)
    .bindPopup(`You are within ${Math.round(radius)} meters from this point`)
    .openPopup();
    
    L.circle(e.latlng, radius, {
        color: '#2563eb',
        fillColor: '#60a5fa',
        fillOpacity: 0.2,
    }).addTo(map);
}

function onLocationError(e) {
    debugError('Location access denied:', e.message);
}

function getUserLocation() {
    if (navigator.geolocation) {
        showLoading(true);
        map.locate({ setView: true, maxZoom: 16 });
        
        setTimeout(() => showLoading(false), 2000);
    } else {
        alert('Geolocation is not supported by your browser');
    }
}

// ===== API FUNCTIONS =====
async function fetchTagLocation(vehicleId) {
    try {
        // Ensure we have a valid token
        const token = await getValidToken();
        
        // Build the API URL with the provided vehicle ID
        const url = CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.getLocation.replace(':imei', vehicleId);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.value || data.value.length === 0) {
            throw new Error(`No location data found for vehicle ${vehicleId}`);
        }
        
        const vehicle = data.value[0];
        
        // Transform to our expected format
        const transformedData = {
            imei: vehicle.vehicle_Id,
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
            timestamp: vehicle.utcTimestamp,
            address: vehicle.locationDescription || '',
            description: vehicle.vehicle_Description || 'Vehicle',
            eventType: vehicle.eventType_Description || '',
            ignitionOn: vehicle.ignitionOn,
            direction: vehicle.direction,
        };
        
        return transformedData;
    } catch (error) {
        debugError(`❌ Failed to fetch location for ${vehicleId}:`, error);
        debugError('❌ API call failed. No mock data will be used.');
        
        // Show user-friendly error
        showError(`Failed to fetch location for vehicle ${vehicleId.substring(0, 8)}...\n${error.message}`);
        
        return null;  // Return null instead of mock data
    }
}

async function fetchAllTags() {
    try {
        const token = await getValidToken();
        const url = CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.getAllTags;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.tags || [];
    } catch (error) {
        debugError('Failed to fetch tags:', error);
        return [];
    }
}

async function addTagToBackend(imei) {
    try {
        const token = await getValidToken();
        const url = CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS.addTag;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imei }),
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        debugError('Failed to add tag:', error);
        throw error;
    }
}

// ===== MOCK DATA (DEPRECATED - NO LONGER USED) =====
// Mock data fallback has been removed. API failures now return null instead.
/*
function generateMockLocation(vehicleId) {
    debugError('⚠️⚠️⚠️ USING MOCK DATA - API CALL FAILED! ⚠️⚠️⚠️');
    debugError('This means the real API is not being used. Check console for errors.');
    
    // Generate random location near Manchester
    const lat = 53.40807 + (Math.random() - 0.5) * 0.1;
    const lon = -2.34979 + (Math.random() - 0.5) * 0.1;
    
    const mockData = {
        imei: vehicleId,
        latitude: lat,
        longitude: lon,
        timestamp: new Date().toISOString(),
        description: '⚠️ MOCK Vehicle (NOT REAL DATA)',
        address: 'Mock Location - Manchester, UK',
        eventType: 'Mock Heartbeat',
        ignitionOn: false,
        direction: 0,
    };
    
    return mockData;
}
*/


// ===== MARKER MANAGEMENT =====
function addOrUpdateMarker(tagData) {
    const { imei, latitude, longitude, timestamp, address, description, eventType, ignitionOn } = tagData;
    
    // Get description from trackedTags if not provided
    const tagDescription = description || (trackedTags.has(imei) ? trackedTags.get(imei).description : 'Vehicle');
    
    // Remove existing marker if exists
    if (markers[imei]) {
        debugLog('  ♻️ Removing old marker for', imei);
        map.removeLayer(markers[imei]);
    }
    
    // Create custom marker icon with different color based on ignition state
    const markerColor = ignitionOn ? '#22c55e' : '#ef4444';  // Green if on, Red if off
    const iconName = ignitionOn ? 'car' : 'map-pin';
    
    const markerIcon = L.divIcon({
        className: ignitionOn ? 'custom-marker custom-marker-pulse' : 'custom-marker',
        html: `<div style="background-color: ${markerColor}; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                <i data-lucide="${iconName}" style="color: white; width: 20px; height: 20px;"></i>
               </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
    });
    
    // Format timestamp
    const timeStr = timestamp ? new Date(timestamp).toLocaleString() : 'Unknown';
    const lastModified = tagData.utcLastModified ? new Date(tagData.utcLastModified).toLocaleString() : timeStr;
    
    // Check if timestamp is older than 24 hours
    const timestampToCheck = tagData.utcLastModified || timestamp;
    const isOld = timestampToCheck ? (new Date() - new Date(timestampToCheck)) > 86400000 : false; // 86400000ms = 24 hours
    const timestampClass = isOld ? 'text-red-600' : 'text-gray-400';
    
    // Create marker with enhanced popup
    const marker = L.marker([latitude, longitude], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
            <div class="p-3" style="min-width: 250px;">
                <div class="flex items-center justify-between mb-2">
                    <p class="font-bold text-gray-800 flex-1">${tagDescription}</p>
                    <button onclick="editVehicleDescription('${imei}', '${tagDescription.replace(/'/g, "\\'")}')" 
                            class="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Edit description">
                        <i data-lucide="edit-2" class="w-4 h-4 text-blue-600"></i>
                    </button>
                </div>
                ${address ? `<p class="text-sm text-gray-700 mb-2"><i data-lucide="map-pin" class="inline w-3 h-3 mr-1"></i>${address}</p>` : ''}
                ${eventType ? `<p class="text-xs text-gray-500 mb-2"><i data-lucide="activity" class="inline w-3 h-3 mr-1"></i>Event: ${eventType}</p>` : ''}
                <p class="text-xs ${timestampClass} mt-2"><i data-lucide="clock" class="inline w-3 h-3 mr-1"></i>Last Updated: ${lastModified}</p>
            </div>
        `);
    
    // Add click event to show info panel
    marker.on('click', () => {
        tagData.description = tagDescription;
        showTagInfo(tagData);
    });
    
    // Re-initialize Lucide icons when popup opens
    marker.on('popupopen', () => {
        lucide.createIcons();
    });
    
    markers[imei] = marker;
    
    // Re-initialize Lucide icons
    lucide.createIcons();
    
    debugLog(`✅ Marker created at coordinates: [${latitude}, ${longitude}]`);

    debugLog(`✅ Marker added/updated for vehicle: ${tagDescription} (${imei})`);
    return marker;
}

function removeMarker(imei) {
    if (markers[imei]) {
        map.removeLayer(markers[imei]);
        delete markers[imei];
        debugLog(`🗑️ Marker removed for IMEI: ${imei}`);
    }
}

// ===== TAG MANAGEMENT =====
async function addTag(vehicleId, description = 'Vehicle') {
    // Validate vehicle ID (GUID format or 15-digit IMEI)
    const isGUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId);
    const isIMEI = /^\d{15}$/.test(vehicleId);
    
    if (!vehicleId || (!isGUID && !isIMEI)) {
        alert('Please enter a valid Vehicle ID (GUID format like 72753c0d-4202-4836-bf9a-aaa30fedefc4) or 15-digit IMEI');
        return;
    }
    
    if (trackedTags.has(vehicleId)) {
        alert('This vehicle is already being tracked');
        return;
    }
    
    showLoading(true);
    
    try {
        // Fetch location from API
        const tagData = await fetchTagLocation(vehicleId);
        
        if (!tagData) {
            showError('Failed to fetch vehicle location. Please check your connection and try again.');
            return;
        }
        
        // Use description from API response if available, otherwise use parameter
        const finalDescription = tagData.description || description;
        tagData.description = finalDescription;
        
        // Add marker to map
        const marker = addOrUpdateMarker(tagData);
        
        // Add to tracked tags
        trackedTags.set(vehicleId, { imei: vehicleId, description: finalDescription });
        
        // Save to localStorage
        saveTags();
        
        // Center map on new marker
        map.setView([tagData.latitude, tagData.longitude], 15);
        
        // Show success message
        marker.openPopup();
        
        debugLog(`✅ Tag added: ${imei}`);
    } catch (error) {
        debugError('Failed to add tag:', error);
        alert('Failed to add tag. Please check your connection and try again.');
    } finally {
        showLoading(false);
    }
}

function refreshAllTags() {
    debugLog('🔄 Refreshing all tag locations...');
    
    trackedTags.forEach(async (tag, imei) => {
        try {
            const tagData = await fetchTagLocation(imei);
            if (tagData) {
                tagData.description = tag.description;
                addOrUpdateMarker(tagData);
            } else {
                debugError(`Failed to refresh ${imei}: No data returned`);
            }
        } catch (error) {
            debugError(`Failed to refresh ${imei}:`, error);
        }
    });
}

function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(() => {
        if (trackedTags.size > 0) {
            refreshAllTags();
        }
    }, CONFIG.REFRESH_INTERVAL);
    
    debugLog(`⏰ Auto-refresh started (every ${CONFIG.REFRESH_INTERVAL / 1000}s)`);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        debugLog('⏸️ Auto-refresh stopped');
    }
}

// ===== UI FUNCTIONS =====
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

function showError(message) {
    debugError('🚨 ERROR:', message);
    alert(message);
}

function showBottomSheet(show) {
    const sheet = document.getElementById('bottomSheet');
    if (show) {
        sheet.classList.add('bottom-sheet-visible');
    } else {
        sheet.classList.remove('bottom-sheet-visible');
        document.getElementById('imeiInput').value = '';
    }
}

function showTagInfo(tagData) {
    selectedTag = tagData;
    
    const description = tagData.description || 'Vehicle';
    document.getElementById('tagTitle').textContent = description;
    // Vehicle ID hidden per user request
    // document.getElementById('tagIMEI').textContent = `Vehicle ID: ${tagData.imei.substring(0, 8)}...`;
    document.getElementById('tagLocation').textContent = tagData.address || `${tagData.latitude.toFixed(6)}, ${tagData.longitude.toFixed(6)}`;
    document.getElementById('tagLastUpdate').textContent = new Date(tagData.timestamp).toLocaleString();
    
    // Ignition status hidden per user request
    // const ignitionStatus = tagData.ignitionOn ? '🚗 Ignition ON' : '⏸️ Ignition OFF';
    // const statusElement = document.getElementById('tagStatus');
    // statusElement.textContent = ignitionStatus;
    // statusElement.className = `text-${tagData.ignitionOn ? 'green' : 'red'}-600 font-medium`;
    
    // Show event type
    document.getElementById('tagEventType').textContent = tagData.eventType || 'Unknown';
    
    // Reset edit mode
    document.getElementById('tagTitleDisplay').style.display = 'flex';
    document.getElementById('tagTitleEdit').style.display = 'none';
    
    const panel = document.getElementById('tagInfoPanel');
    panel.classList.add('bottom-sheet-visible');
    
    // Re-initialize Lucide icons
    lucide.createIcons();
}

function hideTagInfo() {
    const panel = document.getElementById('tagInfoPanel');
    panel.classList.remove('bottom-sheet-visible');
    selectedTag = null;
}

function showSavedTagsPanel(show) {
    const panel = document.getElementById('savedTagsPanel');
    if (show) {
        updateSavedTagsList();
        panel.classList.add('bottom-sheet-visible');
    } else {
        panel.classList.remove('bottom-sheet-visible');
    }
}

function updateSavedTagsList() {
    const listContainer = document.getElementById('savedTagsList');
    const tagCount = document.getElementById('tagCount');
    
    // Update tag count
    if (tagCount) {
        tagCount.textContent = trackedTags.size;
    }
    
    if (!listContainer) {
        debugError('❌ savedTagsList element not found');
        return;
    }
    
    // Clear current list
    listContainer.innerHTML = '';
    
    if (trackedTags.size === 0) {
        // Show empty state message
        listContainer.innerHTML = `
            <div class="text-center py-12" id="noTagsMessage">
                <i data-lucide="map-pin-off" class="w-16 h-16 text-gray-300 mx-auto mb-3"></i>
                <p class="text-gray-400 font-medium">No vehicles tracked yet</p>
                <p class="text-sm text-gray-400 mt-1">Add a vehicle from the Admin tab</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    // Add each tag to the list with modern card design
    trackedTags.forEach((tag, imei) => {
        const tagItem = document.createElement('div');
        const isSelected = selectedVehicleForAdmin && selectedVehicleForAdmin.imei === imei;
        tagItem.className = `relative p-4 rounded-lg border-2 transition-all ${
            isSelected 
                ? 'bg-blue-50 border-blue-500 shadow-md' 
                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow'
        }`;
        
        const displayName = tag.description || 'Vehicle';
        const shortId = imei.length > 20 ? `${imei.substring(0, 8)}...${imei.substring(imei.length - 4)}` : imei;
        
        tagItem.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <i data-lucide="car" class="w-5 h-5 text-blue-600"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-gray-800 truncate mb-1">${displayName}</h4>
                    <p class="text-xs text-gray-500 font-mono truncate mb-3">${shortId}</p>
                    <div class="flex gap-2">
                        <button class="view-tag-btn flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1" data-imei="${imei}">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                            View on Map
                        </button>
                        <button class="select-tag-btn px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center gap-1" data-imei="${imei}">
                            <i data-lucide="check-circle" class="w-4 h-4"></i>
                            Select
                        </button>
                    </div>
                </div>
            </div>
            ${isSelected ? '<div class="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">Selected</div>' : ''}
        `;
        
        // View on Map button handler
        tagItem.querySelector('.view-tag-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            showSavedTagsPanel(false);
            const targetImei = e.currentTarget.dataset.imei;
            
            if (markers[targetImei]) {
                map.setView(markers[targetImei].getLatLng(), 16);
                markers[targetImei].openPopup();
            } else {
                // Fetch and show if marker doesn't exist
                showLoading(true);
                try {
                    const tagData = await fetchTagLocation(targetImei);
                    if (tagData) {
                        tagData.description = tag.description;
                        const marker = addOrUpdateMarker(tagData);
                        map.setView([tagData.latitude, tagData.longitude], 16);
                        marker.openPopup();
                    } else {
                        alert('Failed to load vehicle location: No data returned from API');
                    }
                } catch (error) {
                    debugError('Failed to show tag:', error);
                    alert('Failed to load vehicle location');
                } finally {
                    showLoading(false);
                }
            }
        });
        
        // Select button handler
        tagItem.querySelector('.select-tag-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const targetImei = e.currentTarget.dataset.imei;
            selectVehicleForAdmin(targetImei);
        });
        
        listContainer.appendChild(tagItem);
    });
    
    // Re-initialize Lucide icons
    lucide.createIcons();
}

// ===== TAB SWITCHING =====
function switchTab(tabName) {
    const myTagsTab = document.getElementById('myTagsTab');
    const adminTab = document.getElementById('adminTab');
    const myTagsContent = document.getElementById('myTagsContent');
    const adminContent = document.getElementById('adminContent');
    
    if (tabName === 'myTags') {
        // Activate My Tags tab
        myTagsTab.classList.add('text-blue-600', 'border-blue-600');
        myTagsTab.classList.remove('text-gray-500', 'border-transparent');
        adminTab.classList.remove('text-blue-600', 'border-blue-600');
        adminTab.classList.add('text-gray-500', 'border-transparent');
        
        myTagsContent.classList.remove('hidden');
        adminContent.classList.add('hidden');
    } else if (tabName === 'admin') {
        // Activate Admin tab
        adminTab.classList.add('text-blue-600', 'border-blue-600');
        adminTab.classList.remove('text-gray-500', 'border-transparent');
        myTagsTab.classList.remove('text-blue-600', 'border-blue-600');
        myTagsTab.classList.add('text-gray-500', 'border-transparent');
        
        adminContent.classList.remove('hidden');
        myTagsContent.classList.add('hidden');
    }
    
    // Re-initialize Lucide icons after tab switch
    lucide.createIcons();
}

// ===== ADMIN FUNCTIONS =====
function selectVehicleForAdmin(imei) {
    const vehicle = trackedTags.get(imei);
    if (!vehicle) return;
    
    selectedVehicleForAdmin = vehicle;
    
    // Update UI
    document.getElementById('adminSelectedVehicle').classList.remove('hidden');
    document.getElementById('adminSelectedName').textContent = vehicle.description || 'Vehicle';
    document.getElementById('adminSelectedId').textContent = imei.length > 30 
        ? `${imei.substring(0, 12)}...${imei.substring(imei.length - 8)}` 
        : imei;
    
    // Enable rename and delete buttons
    document.getElementById('adminRenameInput').disabled = false;
    document.getElementById('adminRenameBtn').disabled = false;
    document.getElementById('adminDeleteBtn').disabled = false;
    
    // Populate rename input with current name
    document.getElementById('adminRenameInput').value = vehicle.description || '';
    
    // Switch to admin tab
    switchTab('admin');
    
    // Update the list to show selection
    updateSavedTagsList();
    
    debugLog(`✅ Selected vehicle for admin: ${vehicle.description}`);
}

function clearVehicleSelection() {
    selectedVehicleForAdmin = null;
    
    // Update UI
    document.getElementById('adminSelectedVehicle').classList.add('hidden');
    document.getElementById('adminSelectedName').textContent = '--';
    document.getElementById('adminSelectedId').textContent = '--';
    
    // Disable rename and delete buttons
    document.getElementById('adminRenameInput').value = '';
    document.getElementById('adminRenameInput').disabled = true;
    document.getElementById('adminRenameBtn').disabled = true;
    document.getElementById('adminDeleteBtn').disabled = true;
    
    // Update list to clear selection highlight
    updateSavedTagsList();
}

function renameSelectedVehicle() {
    if (!selectedVehicleForAdmin) {
        alert('Please select a vehicle first');
        return;
    }
    
    const newName = document.getElementById('adminRenameInput').value.trim();
    if (!newName) {
        alert('Please enter a new name');
        return;
    }
    
    const imei = selectedVehicleForAdmin.imei;
    updateTagDescription(imei, newName);
    
    // Update marker popup
    const marker = markers[imei];
    if (marker && selectedTag && selectedTag.imei === imei) {
        // Also update tag info panel if it's open
        document.getElementById('tagTitle').textContent = newName;
    }
    
    // Update selected vehicle
    selectedVehicleForAdmin.description = newName;
    document.getElementById('adminSelectedName').textContent = newName;
    
    // Update the list
    updateSavedTagsList();
    
    debugLog(`✅ Renamed vehicle to: ${newName}`);
    alert(`Vehicle renamed to "${newName}"`);
}

function deleteSelectedVehicle() {
    if (!selectedVehicleForAdmin) {
        alert('Please select a vehicle first');
        return;
    }
    
    const vehicleName = selectedVehicleForAdmin.description || 'this vehicle';
    if (confirm(`Are you sure you want to delete "${vehicleName}"?`)) {
        removeTag(selectedVehicleForAdmin.imei);
        clearVehicleSelection();
        updateSavedTagsList();
        debugLog(`🗑️ Deleted vehicle: ${vehicleName}`);
    }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', async () => {
    showLoading(true);
    debugLog('🚀 Initializing Vehicle Tracker...');
    
    try {
        // Step 1: Initialize map FIRST (don't wait for auth)
        debugLog('🗺️ Step 1: Initializing map...');
        initMap();
        debugLog('✅ Map initialized');
        
        // Add scale control after map loads
        setTimeout(() => {
            const scaleControl = L.control.scale({
                position: 'bottomleft',
                metric: true,
                imperial: false,
                maxWidth: 100
            });
            scaleControl.addTo(map);
            debugLog('📏 Distance scale ruler added to map');
        }, 500);
        
        // Step 2: Ready for user interaction (tags will load when BLE panel is opened)
        debugLog('📦 Step 2: Ready - Tags will load when you open the BLE panel');
        
        debugLog('✅ Vehicle Tracker initialized successfully');
        
    } catch (error) {
        debugError('❌ Map initialization failed:', error);
        showError(`Failed to initialize map: ${error.message}`);
    } finally {
        showLoading(false);
    }
    
    // Step 4: Try to authenticate in background (non-blocking)
    debugLog('🔐 Step 4: Authenticating with backend server (background)...');
    debugLog('⏱️  Token will auto-refresh every ~55 minutes');
    fetchAuthToken()
        .then(() => {
            debugLog('✅ Authentication successful - API calls will now work');
            debugLog('🔄 Automatic token refresh scheduled');
            debugLog('👉 Open the BLE panel or search to add vehicles');
        })
        .catch(error => {
            console.error('⚠️ Backend authentication failed:', error);
            debugError('╔════════════════════════════════════════════════════════╗');
            console.error('║  🚨 BACKEND SERVER NOT RUNNING                         ║');
            debugError('╠════════════════════════════════════════════════════════╣');
            debugError('║  Start the backend server first:                       ║');
            debugError('║  1. Open PowerShell                                    ║');
            debugError('║  2. Run: .\\START_SERVER.ps1                            ║');
            debugError(`║  3. Backend URL: ${CONFIG.BACKEND_URL}                 ║`);
            debugError('╚════════════════════════════════════════════════════════╝');
        });
    
    // Add tag button (FAB)
    const addTagBtn = document.getElementById('addTagBtn');
    debugLog('addTagBtn element:', addTagBtn);
    if (addTagBtn) {
        addTagBtn.addEventListener('click', () => {
            debugLog('🎯 Add tag button clicked!');
            showBottomSheet(true);
        });
        debugLog('✅ addTagBtn listener added');
    } else {
        debugError('❌ addTagBtn element not found!');
    }
    
    // Manual add button
    document.getElementById('addManualBtn').addEventListener('click', () => {
        const imei = document.getElementById('imeiInput').value.trim();
        addTag(imei);
        showBottomSheet(false);
    });
    
    // Close bottom sheet
    document.getElementById('closeSheetBtn').addEventListener('click', () => {
        showBottomSheet(false);
    });
    
    // Scan QR button
    document.getElementById('scanQRBtn').addEventListener('click', () => {
        showBottomSheet(false);
        startQRScanner();  // Defined in scanner.js
    });
    
    // Close tag info panel
    document.getElementById('closeTagInfoBtn').addEventListener('click', hideTagInfo);
    
    // ========== SEARCH FUNCTIONALITY ==========
    let allVehicles = []; // Store all vehicles from API
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchResultsList = document.getElementById('searchResultsList');
    
    // Fetch all vehicles from API
    async function fetchAllVehicles() {
        try {
            debugLog('🔍 Fetching all vehicles from API...');
            const token = await getValidToken();
            if (!token) {
                debugError('❌ No valid token available for search');
                return [];
            }
            
            const apiUrl = 'https://live.mzoneweb.net/mzone62.api/Vehicles?$format=json&$count=true&$select=id%2Cdescription%2CvehicleIcon%2CvehicleIconColor%2ClastKnownEventUtcLastModified%2CdisablementFeatureAvailable%2CignitionOn%2Cregistration%2ClastKnownEventUtcTimestamp%2ClastKnownGpsEventUtcTimestamp%2CdecimalOdometer%2CengineSeconds%2Cvin%2Cunit_Description%2CvehicleDisabled&$orderby=description&$skip=0&$top=25&vehicleGroup_Id=8e4fe3a7-4d46-474d-bf57-993828f70968&$expand=lastKnownPosition(%24select%3Dlongitude%2Clatitude%2CeventType_Id%2CutcTimestamp%2Cspeed)%2ClastKnownTemperature(%24select%3DutcTimestamp)%2CvehicleType(%24select%3DvehicleNotReportedThreshold)%2Cmake(%24select%3Ddescription)%2Cmodel(%24select%3Ddescription)%2ClastKnownFuelConsumption(%24select%3DaverageConsumption%2CaverageConsumptionUtcTimestamp%2CinstantaneousConsumption%2CinstantaneousConsumptionUtcTimestamp)%2ClastKnownFuelLevel(%24select%3Dlevel%2Cpercentage%2CutcTimestamp)';
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                debugError(`❌ API returned ${response.status}: ${response.statusText}`);
                throw new Error(`API returned ${response.status}`);
            }
            
            const data = await response.json();
            allVehicles = data.value || [];
            debugLog(`✅ Fetched ${allVehicles.length} vehicles for search:`, allVehicles);
            return allVehicles;
        } catch (error) {
            debugError('❌ Failed to fetch vehicles for search:', error);
            return [];
        }
    }
    
    // Filter and display search results
    function displaySearchResults(query = '') {
        debugLog(`🔍 Filtering ${allVehicles.length} vehicles with query: "${query}"`);
        
        const filtered = query.trim() === '' 
            ? allVehicles 
            : allVehicles.filter(v => 
                (v.description || '').toLowerCase().includes(query.toLowerCase()) ||
                (v.registration || '').toLowerCase().includes(query.toLowerCase())
            );
        
        debugLog(`✅ Found ${filtered.length} matching vehicles`);
        
        if (filtered.length === 0) {
            searchResultsList.innerHTML = '<div class="search-no-results">No vehicles found</div>';
        } else {
            searchResultsList.innerHTML = filtered.map(vehicle => `
                <div class="search-result-item" data-vehicle-id="${vehicle.id}">
                    <div class="search-result-name">${vehicle.description || 'Unnamed Vehicle'}</div>
                    ${vehicle.registration ? `<div class="search-result-registration">${vehicle.registration}</div>` : ''}
                </div>
            `).join('');
            
            // Add click handlers to each result
            searchResultsList.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const vehicleId = item.getAttribute('data-vehicle-id');
                    await plotVehicleFromSearch(vehicleId);
                    // Clear and hide search
                    searchInput.value = '';
                    searchResults.classList.add('hidden');
                });
            });
        }
        
        searchResults.classList.remove('hidden');
    }
    
    // Plot vehicle on map from search
    async function plotVehicleFromSearch(vehicleId) {
        try {
            debugLog(`🔍 Plotting vehicle from search: ${vehicleId}`);
            showLoading(true);
            
            const token = await getValidToken();
            if (!token) {
                alert('Authentication required');
                return;
            }
            
            const apiUrl = `https://live.mzoneweb.net/mzone62.api/LastKnownPositions?$filter=vehicle_Id eq ${vehicleId}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            
            const data = await response.json();
            const position = data.value && data.value[0];
            
            if (!position || !position.latitude || !position.longitude) {
                alert('No location data available for this vehicle');
                return;
            }
            
            // Create marker data in the correct format for addOrUpdateMarker
            const tagData = {
                imei: vehicleId,
                latitude: position.latitude,
                longitude: position.longitude,
                description: position.vehicle_Description || 'Vehicle',
                timestamp: position.utcTimestamp,
                address: position.locationDescription || '',
                eventType: position.eventType_Description || '',
                ignitionOn: position.ignitionOn,
                utcLastModified: position.utcLastModified
            };
            
            // Add marker using standard function (ensures consistent popup)
            const marker = addOrUpdateMarker(tagData);
            
            // Fly to location
            map.flyTo([position.latitude, position.longitude], 15, {
                duration: 1.5,
                easeLinearity: 0.5
            });
            
            // Open popup after animation
            setTimeout(() => {
                if (marker) {
                    marker.openPopup();
                }
            }, 1500);
            
            debugLog(`✅ Vehicle plotted on map at [${position.latitude}, ${position.longitude}]`);
        } catch (error) {
            debugError('❌ Failed to plot vehicle:', error);
            alert('Failed to load vehicle location');
        } finally {
            showLoading(false);
        }
    }
    
    // Search input focus - fetch and show all vehicles
    searchInput.addEventListener('focus', async () => {
        if (allVehicles.length === 0) {
            showLoading(true);
            await fetchAllVehicles();
            showLoading(false);
        }
        displaySearchResults(searchInput.value);
    });
    
    // Search input typing - filter results
    searchInput.addEventListener('input', (e) => {
        if (allVehicles.length === 0) return;
        displaySearchResults(e.target.value);
    });
    
    // Click outside to close search results
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
    // ========== END SEARCH FUNCTIONALITY ==========
    
    // Remove tag button in tag info panel
    document.getElementById('removeTagBtn').addEventListener('click', () => {
        if (selectedTag && selectedTag.imei) {
            if (confirm(`Remove tag ${selectedTag.imei}?`)) {
                removeTag(selectedTag.imei);
                hideTagInfo();
            }
        }
    });
    
    // Edit description button
    document.getElementById('editDescBtn').addEventListener('click', () => {
        if (selectedTag && selectedTag.imei) {
            const tagData = trackedTags.get(selectedTag.imei);
            const currentDescription = tagData ? tagData.description : 'BLE Tag';
            
            // Show edit UI, hide display UI
            document.getElementById('tagTitleDisplay').style.display = 'none';
            document.getElementById('tagTitleEdit').style.display = 'flex';
            
            // Set current description and focus
            const input = document.getElementById('tagDescInput');
            input.value = currentDescription;
            input.focus();
            input.select();
        }
    });
    
    // Save description button
    document.getElementById('saveDescBtn').addEventListener('click', () => {
        if (selectedTag && selectedTag.imei) {
            const newDescription = document.getElementById('tagDescInput').value.trim() || 'BLE Tag';
            
            // Update the description
            updateTagDescription(selectedTag.imei, newDescription);
            
            // Update the marker popup
            const marker = markers.get(selectedTag.imei);
            if (marker) {
                marker.setPopupContent(`
                    <div class="p-2">
                        <p class="font-bold">${newDescription}</p>
                        <p class="text-sm">IMEI: ${selectedTag.imei}</p>
                        <p class="text-xs text-gray-500">Last update: ${new Date().toLocaleTimeString()}</p>
                    </div>
                `);
            }
            
            // Update the tag info panel title
            document.getElementById('tagTitle').textContent = newDescription;
            
            // Update saved tags list
            updateSavedTagsList();
            
            // Hide edit UI, show display UI
            document.getElementById('tagTitleEdit').style.display = 'none';
            document.getElementById('tagTitleDisplay').style.display = 'flex';
        }
    });
    
    // Cancel description edit button
    document.getElementById('cancelDescBtn').addEventListener('click', () => {
        // Hide edit UI, show display UI without saving
        document.getElementById('tagTitleEdit').style.display = 'none';
        document.getElementById('tagTitleDisplay').style.display = 'flex';
    });
    
    // Allow Enter key to save description
    document.getElementById('tagDescInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('saveDescBtn').click();
        }
    });
    
    // Center map on selected tag
    document.getElementById('centerMapBtn').addEventListener('click', () => {
        if (selectedTag) {
            map.setView([selectedTag.latitude, selectedTag.longitude], 16);
            hideTagInfo();
        }
    });
    
    // Allow Enter key to add IMEI
    document.getElementById('imeiInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('addManualBtn').click();
        }
    });
    
    // Close saved tags panel
    document.getElementById('closeSavedTagsBtn').addEventListener('click', () => {
        showSavedTagsPanel(false);
        clearVehicleSelection();  // Clear selection when closing panel
    });
    
    // Clear all tags button
    document.getElementById('clearAllTagsBtn').addEventListener('click', () => {
        clearAllTags();
        clearVehicleSelection();
        updateSavedTagsList();
    });
    
    // ===== TAB SWITCHING LISTENERS =====
    document.getElementById('myTagsTab').addEventListener('click', () => {
        switchTab('myTags');
    });
    
    document.getElementById('adminTab').addEventListener('click', () => {
        switchTab('admin');
    });
    
    // ===== ADMIN PANEL LISTENERS =====
    // Admin add button
    document.getElementById('adminAddBtn').addEventListener('click', () => {
        const vehicleId = document.getElementById('adminImeiInput').value.trim();
        if (vehicleId) {
            addTag(vehicleId);
            document.getElementById('adminImeiInput').value = '';
        }
    });
    
    // Admin add - Enter key
    document.getElementById('adminImeiInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('adminAddBtn').click();
        }
    });
    
    // Admin scan QR button
    document.getElementById('adminScanBtn').addEventListener('click', () => {
        showSavedTagsPanel(false);
        startQRScanner();  // Defined in scanner.js
    });
    
    // Admin rename button
    document.getElementById('adminRenameBtn').addEventListener('click', () => {
        renameSelectedVehicle();
    });
    
    // Admin rename - Enter key
    document.getElementById('adminRenameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('adminRenameBtn').click();
        }
    });
    
    // Admin delete button
    document.getElementById('adminDeleteBtn').addEventListener('click', () => {
        deleteSelectedVehicle();
    });
    
    // Refresh all button in My Tags tab
    document.getElementById('refreshAllBtn').addEventListener('click', () => {
        refreshAllTags();
        alert('Refreshing all vehicle locations...');
    });
    
    // BLE Tags List Panel Handlers
    const bleListBtn = document.getElementById('bleListBtn');
    const bleTagsPanel = document.getElementById('bleTagsPanel');
    const closeBleListBtn = document.getElementById('closeBleListBtn');
    const bleTagsList = document.getElementById('bleTagsList');
    const vehiclesLoading = document.getElementById('vehiclesLoading');
    
    // Function to format timestamp
    function formatTimestamp(utcTimestamp) {
        if (!utcTimestamp) return 'Unknown';
        const date = new Date(utcTimestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
    
    // Function to fetch vehicle position using LastKnownPositions API
    async function fetchVehiclePosition(vehicleId) {
        try {
            const token = await getValidToken();
            if (!token) {
                throw new Error('No authentication token available');
            }
            
            const apiUrl = `https://live.mzoneweb.net/mzone62.api/LastKnownPositions?$filter=vehicle_Id eq ${vehicleId}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.value || data.value.length === 0) {
                throw new Error('No position data found for this vehicle');
            }
            
            return data.value[0];
        } catch (error) {
            debugError('❌ Failed to fetch vehicle position:', error);
            return null;
        }
    }
    
    // Function to populate vehicles list
    async function populateVehiclesList() {
        // Show loading
        vehiclesLoading.classList.remove('hidden');
        bleTagsList.innerHTML = '';
        
        const vehicles = await fetchVehicles();
        
        // Hide loading
        vehiclesLoading.classList.add('hidden');
        
        if (vehicles.length === 0) {
            bleTagsList.innerHTML = `
                <div class="text-center text-gray-500 py-8 px-4">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 text-gray-400"></i>
                    <p>No vehicles found</p>
                    <p class="text-sm mt-1">Check your API connection</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }
        
        bleTagsList.innerHTML = vehicles.map(vehicle => {
            const description = vehicle.description || 'Unnamed Vehicle';
            const timestamp = vehicle.lastKnownPosition?.utcTimestamp || vehicle.lastKnownEventUtcTimestamp;
            const timeAgo = formatTimestamp(timestamp);
            const hasLocation = vehicle.lastKnownPosition && vehicle.lastKnownPosition.latitude && vehicle.lastKnownPosition.longitude;
            const ignitionOn = vehicle.ignitionOn;
            
            // Check if timestamp is older than 24 hours
            const isOld = timestamp ? (new Date() - new Date(timestamp)) > 86400000 : false; // 86400000ms = 24 hours
            const timestampClass = isOld ? 'text-red-600' : 'text-gray-500';
            
            return `
                <div class="vehicle-item p-3 border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition" 
                     data-vehicle-id="${vehicle.id}"
                     data-lat="${vehicle.lastKnownPosition?.latitude || ''}"
                     data-lng="${vehicle.lastKnownPosition?.longitude || ''}"
                     data-description="${description}">
                    <div class="flex items-start gap-2">
                        <div class="flex-shrink-0 mt-1">
                            <div class="w-10 h-10 rounded-full ${ignitionOn ? 'bg-green-100' : 'bg-gray-100'} flex items-center justify-center">
                                <i data-lucide="${ignitionOn ? 'zap' : 'power'}" class="w-5 h-5 ${ignitionOn ? 'text-green-600' : 'text-gray-400'}"></i>
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-semibold text-gray-800 truncate">${description}</h3>
                            <p class="text-xs ${timestampClass} mt-1">
                                <i data-lucide="clock" class="w-3 h-3 inline"></i> ${timeAgo}
                            </p>
                            ${hasLocation ? `
                                <p class="text-xs text-green-600 mt-1">
                                    <i data-lucide="map-pin" class="w-3 h-3 inline"></i> Location available
                                </p>
                            ` : `
                                <p class="text-xs text-gray-400 mt-1">
                                    <i data-lucide="map-pin-off" class="w-3 h-3 inline"></i> No location
                                </p>
                            `}
                        </div>
                        <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400 flex-shrink-0 mt-2"></i>
                    </div>
                </div>
            `;
        }).join('');
        
        // Re-initialize Lucide icons
        lucide.createIcons();
        
        // Add click handlers to each vehicle item
        document.querySelectorAll('.vehicle-item').forEach(item => {
            item.addEventListener('click', async function() {
                const vehicleId = this.getAttribute('data-vehicle-id');
                const description = this.getAttribute('data-description');
                
                // Close the panel
                bleTagsPanel.classList.add('-translate-x-full');
                
                // Show loading indicator
                showLoading(true);
                
                // Fetch fresh position data using LastKnownPositions API
                const positionData = await fetchVehiclePosition(vehicleId);
                
                showLoading(false);
                
                if (positionData && positionData.latitude && positionData.longitude) {
                    // Create marker data
                    const tagData = {
                        imei: vehicleId,
                        latitude: positionData.latitude,
                        longitude: positionData.longitude,
                        description: positionData.vehicle_Description || description,
                        timestamp: positionData.utcTimestamp,
                        address: positionData.locationDescription || '',
                        eventType: positionData.eventType_Description || '',
                        ignitionOn: positionData.ignitionOn,
                        utcLastModified: positionData.utcLastModified
                    };
                    
                    // Add marker to map
                    addOrUpdateMarker(tagData);
                    
                    // Center map on the location
                    map.setView([positionData.latitude, positionData.longitude], 16, {
                        animate: true,
                        duration: 1
                    });
                    
                    // Open popup after animation
                    setTimeout(() => {
                        const marker = markers[vehicleId];
                        if (marker) {
                            marker.openPopup();
                        }
                    }, 500);
                } else {
                    alert('Failed to fetch vehicle location. Please try again.');
                }
            });
        });
    }
    
    // Function to edit vehicle description
    window.editVehicleDescription = function(vehicleId, currentDescription) {
        const newDescription = prompt('Edit vehicle description:', currentDescription);
        
        if (newDescription && newDescription !== currentDescription) {
            // Update in trackedTags Map
            if (trackedTags.has(vehicleId)) {
                const tagData = trackedTags.get(vehicleId);
                tagData.description = newDescription;
                trackedTags.set(vehicleId, tagData);
                saveTrackedTags();
                
                // Update marker if exists
                if (markers[vehicleId]) {
                    addOrUpdateMarker(tagData);
                }
                
                // Refresh vehicles list if panel is open
                if (!bleTagsPanel.classList.contains('-translate-x-full')) {
                    populateVehiclesList();
                }
                
                debugLog(`✅ Updated vehicle description: ${newDescription}`);
            }
        }
    };
    
    // Show BLE tags panel
    if (bleListBtn) {
        bleListBtn.addEventListener('click', () => {
            populateVehiclesList();
            bleTagsPanel.classList.remove('-translate-x-full');
        });
    }
    
    // Close BLE tags panel
    if (closeBleListBtn) {
        closeBleListBtn.addEventListener('click', () => {
            bleTagsPanel.classList.add('-translate-x-full');
        });
    }
    
    // Close panel when clicking outside
    bleTagsPanel.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.add('-translate-x-full');
        }
    });
    
    // Bottom Navigation Handlers
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Handle navigation based on which item was clicked
            const navId = this.id;
            
            switch(navId) {
                case 'navMap':
                    // Show map view (default view)
                    debugLog('Showing MAP view');
                    const mapDiv = document.getElementById('map');
                    mapDiv.style.display = 'block';
                    mapDiv.style.height = '100vh';
                    document.getElementById('reportsPanel').classList.add('hidden');
                    document.getElementById('addTagBtn').style.display = 'block';
                    // Reset reports panel layout
                    document.getElementById('reportsPanel').style.top = '0';
                    document.getElementById('reportsPanel').style.height = '100%';
                    // Invalidate map size
                    setTimeout(() => map.invalidateSize(), 100);
                    break;
                    
                case 'navReports':
                    debugLog('Showing REPORTS view');
                    document.getElementById('map').style.display = 'none';
                    document.getElementById('reportsPanel').classList.remove('hidden');
                    document.getElementById('addTagBtn').style.display = 'none';
                    // Reset reports panel layout and hide clear route button
                    document.getElementById('reportsPanel').style.top = '0';
                    document.getElementById('reportsPanel').style.height = '100%';
                    const clearRouteBtnNav = document.getElementById('clearRouteBtn');
                    if (clearRouteBtnNav) {
                        clearRouteBtnNav.classList.add('hidden');
                    }
                    populateVehicleSelector();
                    lucide.createIcons();
                    break;
                    
                case 'navSettings':
                    debugLog('Showing SETTINGS view');
                    openSettingsBlade();
                    break;
                    
                case 'navAccount':
                    debugLog('Showing ACCOUNT popup');
                    toggleAccountPopup();
                    break;
            }
        });
    });
});

// ===== REPORTS FUNCTIONALITY =====

/**
 * Populate vehicle selector dropdown with all vehicles from API
 */
async function populateVehicleSelector() {
    const selector = document.getElementById('reportVehicleSelect');
    if (!selector) return;
    
    // Clear existing options except the first one
    selector.innerHTML = '<option value="">-- Loading vehicles... --</option>';
    
    try {
        // Fetch all vehicles from API
        const vehicles = await fetchVehicles();
        
        // Clear and repopulate
        selector.innerHTML = '<option value="">-- Select a Tag --</option>';
        
        if (vehicles.length === 0) {
            selector.innerHTML += '<option value="" disabled>No vehicles available</option>';
            return;
        }
        
        // Add each vehicle to the dropdown - show only description
        vehicles.forEach(vehicle => {
            if (vehicle.description) {  // Only add if description exists
                const option = document.createElement('option');
                option.value = vehicle.id;
                option.textContent = vehicle.description;  // Just the description, e.g., "Chris Credit Card"
                selector.appendChild(option);
            }
        });
        
        debugLog(`✅ Populated vehicle selector with ${vehicles.length} vehicles`);
    } catch (error) {
        debugError('❌ Failed to populate vehicle selector:', error);
        selector.innerHTML = '<option value="">-- Failed to load vehicles --</option>';
    }
}

/**
 * Calculate date range based on selected period
 */
function getDateRange(period) {
    const now = new Date();
    let startDate, endDate;
    
    switch(period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
            
        case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
            endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
            break;
            
        case 'thisWeek':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
            startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
            
        case 'prevWeek':
            const prevWeekEnd = new Date(now);
            prevWeekEnd.setDate(now.getDate() - now.getDay() - 1); // Saturday of prev week
            const prevWeekStart = new Date(prevWeekEnd);
            prevWeekStart.setDate(prevWeekEnd.getDate() - 6); // Sunday of prev week
            startDate = new Date(prevWeekStart.getFullYear(), prevWeekStart.getMonth(), prevWeekStart.getDate(), 0, 0, 0);
            endDate = new Date(prevWeekEnd.getFullYear(), prevWeekEnd.getMonth(), prevWeekEnd.getDate(), 23, 59, 59);
            break;
            
        case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
            
        case 'prevMonth':
            const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            startDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1, 0, 0, 0);
            endDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59);
            break;
            
        default:
            return null;
    }
    
    return { startDate, endDate };
}

/**
 * Format duration in seconds to readable format
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Fetch trips from API
 */
async function fetchTrips(vehicleId, startDate, endDate) {
    try {
        const token = await getValidToken();
        if (!token) {
            throw new Error('Authentication required');
        }
        
        // Format dates for API (UTC) - API expects ISO format without milliseconds
        const utcStartDate = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
        const utcEndDate = endDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
        
        // Build API URL - Note: vehicleGroup_Id and filter must be separate parameters
        const params = new URLSearchParams({
            '$format': 'json',
            '$count': 'true',
            '$select': 'vehicle_Description,duration,distance,startLocationDescription,startUtcTimestamp,endLocationDescription,endUtcTimestamp,driver_Description,id,vehicle_Id,driverKeyCode',
            '$orderby': 'startUtcTimestamp desc',
            '$skip': '0',
            '$top': '100',
            'utcStartDate': utcStartDate,
            'utcEndDate': utcEndDate,
            'vehicleGroup_Id': '8e4fe3a7-4d46-474d-bf57-993828f70968',
            '$filter': `vehicle_Id eq ${vehicleId}`
        });
        
        const url = `${CONFIG.API_BASE_URL}/Trips?${params.toString()}`;
        
        debugLog('📊 Fetching trips:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            debugError(`❌ API Error ${response.status}:`, errorText);
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        debugLog(`✅ Fetched ${data.value?.length || 0} trips`);
        return data.value || [];
        
    } catch (error) {
        debugError('❌ Failed to fetch trips:', error);
        throw error;
    }
}

/**
 * Fetch trip events/waypoints for route plotting
 */
async function fetchTripEvents(tripId) {
    try {
        const token = await getValidToken();
        if (!token) {
            throw new Error('Authentication required');
        }
        
        const url = `${CONFIG.API_BASE_URL}/Trips(${tripId})/events?$orderby=utcTimestamp&$select=id,utcTimestamp,latitude,longitude,direction,eventType_Id,eventType_Description,eventType_MapMarker2,speed,decimalOdometer`;
        
        debugLog('🗺️ Fetching trip route:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            debugError(`❌ API Error ${response.status}:`, errorText);
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        debugLog(`✅ Fetched ${data.value?.length || 0} waypoints for trip ${tripId}`);
        return data.value || [];
        
    } catch (error) {
        debugError('❌ Failed to fetch trip events:', error);
        throw error;
    }
}

/**
 * Plot trip route on map
 */
async function plotTripRoute(trip) {
    try {
        debugLog('📍 Plotting trip route for trip ID:', trip.id);
        
        // Show map and ensure reports panel stays visible (half-screen layout)
        const mapDiv = document.getElementById('map');
        const reportsPanel = document.getElementById('reportsPanel');
        
        mapDiv.style.display = 'block';
        mapDiv.style.height = '50%';
        reportsPanel.classList.remove('hidden');
        reportsPanel.style.top = '50%';
        reportsPanel.style.height = '50%';
        
        // Show clear route button
        const clearRouteBtn = document.getElementById('clearRouteBtn');
        if (clearRouteBtn) {
            clearRouteBtn.classList.remove('hidden');
        }
        
        // Fetch trip events
        const events = await fetchTripEvents(trip.id);
        
        if (events.length === 0) {
            alert('No route data available for this trip');
            return;
        }
        
        // Clear existing route and markers
        if (currentTripPolyline) {
            map.removeLayer(currentTripPolyline);
            currentTripPolyline = null;
        }
        currentTripMarkers.forEach(marker => map.removeLayer(marker));
        currentTripMarkers = [];
        
        // Extract coordinates
        const coordinates = events
            .filter(e => e.latitude && e.longitude)
            .map(e => [e.latitude, e.longitude]);
        
        if (coordinates.length === 0) {
            alert('No valid coordinates found for this trip');
            return;
        }
        
        // Create polyline for route
        currentTripPolyline = L.polyline(coordinates, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7
        }).addTo(map);
        
        // Add start marker (green)
        const startEvent = events[0];
        const startMarker = L.marker([startEvent.latitude, startEvent.longitude], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: #22c55e; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        <i data-lucide="map-pin" style="color: white; width: 20px; height: 20px;"></i>
                       </div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 36],
            })
        }).addTo(map).bindPopup(`
            <div class="p-2">
                <p class="font-bold text-green-600">Trip Start</p>
                <p class="text-xs text-gray-600">${trip.startLocationDescription || 'Unknown'}</p>
                <p class="text-xs text-gray-500">${new Date(trip.startUtcTimestamp).toLocaleString()}</p>
            </div>
        `);
        currentTripMarkers.push(startMarker);
        
        // Add end marker (red)
        const endEvent = events[events.length - 1];
        const endMarker = L.marker([endEvent.latitude, endEvent.longitude], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: #ef4444; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        <i data-lucide="flag" style="color: white; width: 20px; height: 20px;"></i>
                       </div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 36],
            })
        }).addTo(map).bindPopup(`
            <div class="p-2">
                <p class="font-bold text-red-600">Trip End</p>
                <p class="text-xs text-gray-600">${trip.endLocationDescription || 'Unknown'}</p>
                <p class="text-xs text-gray-500">${new Date(trip.endUtcTimestamp).toLocaleString()}</p>
            </div>
        `);
        currentTripMarkers.push(endMarker);
        
        // Invalidate map size (needed after resizing the container)
        setTimeout(() => {
            map.invalidateSize();
            // Fit map to route bounds
            map.fitBounds(currentTripPolyline.getBounds(), { padding: [50, 50] });
        }, 100);
        
        // Re-initialize Lucide icons
        lucide.createIcons();
        
        debugLog('✅ Trip route plotted with', coordinates.length, 'waypoints');
        
    } catch (error) {
        debugError('❌ Failed to plot trip route:', error);
        alert('Failed to plot trip route. Please try again.');
    }
}

/**
 * Display trips in the UI
 */
function displayTrips(trips) {
    const tripsList = document.getElementById('tripsList');
    const summary = document.getElementById('tripsSummary');
    const tripsCount = document.getElementById('tripsCount');
    const totalDistanceEl = document.getElementById('totalDistance');
    
    if (!tripsList) {
        debugError('❌ tripsList element not found');
        return;
    }
    
    if (trips.length === 0) {
        tripsList.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-12 text-center">
                <i data-lucide="inbox" class="w-16 h-16 mx-auto mb-4 text-gray-300"></i>
                <p class="text-gray-500 font-medium mb-2">No trips found</p>
                <p class="text-sm text-gray-400">Try selecting a different period</p>
            </div>
        `;
        if (summary) summary.classList.add('hidden');
        lucide.createIcons();
        return;
    }
    
    // Calculate total distance
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    
    // Update summary
    if (tripsCount) tripsCount.textContent = trips.length;
    if (totalDistanceEl) totalDistanceEl.textContent = `${totalDistance.toFixed(2)} km`;
    if (summary) summary.classList.remove('hidden');
    
    // Generate trip cards
    tripsList.innerHTML = trips.map(trip => {
        const startTime = new Date(trip.startUtcTimestamp).toLocaleString();
        const endTime = new Date(trip.endUtcTimestamp).toLocaleString();
        const duration = formatDuration(trip.duration);
        const distance = trip.distance ? `${trip.distance.toFixed(2)} km` : 'N/A';
        
        return `
            <div class="trip-card bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition cursor-pointer" data-trip-id="${trip.id}">
                <!-- Header: Times, Distance, Duration -->
                <div class="grid grid-cols-2 gap-4 mb-3 pb-3 border-b border-gray-200">
                    <div>
                        <div class="flex items-center text-xs text-gray-500 mb-1">
                            <i data-lucide="clock" class="w-3 h-3 mr-1"></i>
                            Start Time
                        </div>
                        <div class="text-sm font-semibold text-gray-800">${new Date(trip.startUtcTimestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                        <div class="text-xs text-gray-500">${new Date(trip.startUtcTimestamp).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <div class="flex items-center text-xs text-gray-500 mb-1">
                            <i data-lucide="clock" class="w-3 h-3 mr-1"></i>
                            End Time
                        </div>
                        <div class="text-sm font-semibold text-gray-800">${new Date(trip.endUtcTimestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                        <div class="text-xs text-gray-500">${new Date(trip.endUtcTimestamp).toLocaleDateString()}</div>
                    </div>
                </div>
                
                <!-- Stats: Distance & Duration -->
                <div class="grid grid-cols-2 gap-4 mb-3">
                    <div class="bg-blue-50 rounded-lg p-3">
                        <div class="flex items-center text-xs text-blue-600 mb-1">
                            <i data-lucide="map-pin" class="w-3 h-3 mr-1"></i>
                            Distance
                        </div>
                        <div class="text-lg font-bold text-blue-700">${distance}</div>
                    </div>
                    <div class="bg-green-50 rounded-lg p-3">
                        <div class="flex items-center text-xs text-green-600 mb-1">
                            <i data-lucide="timer" class="w-3 h-3 mr-1"></i>
                            Duration
                        </div>
                        <div class="text-lg font-bold text-green-700">${duration}</div>
                    </div>
                </div>
                
                <!-- Locations -->
                <div class="space-y-2">
                    <div class="flex items-start gap-2">
                        <div class="mt-1 bg-green-100 rounded-full p-1">
                            <i data-lucide="map-pin" class="w-4 h-4 text-green-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="text-xs text-gray-500 mb-1">Start Location</div>
                            <div class="text-sm text-gray-700">${trip.startLocationDescription || 'Unknown location'}</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-2">
                        <div class="mt-1 bg-red-100 rounded-full p-1">
                            <i data-lucide="flag" class="w-4 h-4 text-red-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="text-xs text-gray-500 mb-1">End Location</div>
                            <div class="text-sm text-gray-700">${trip.endLocationDescription || 'Unknown location'}</div>
                        </div>
                    </div>
                </div>
                
                ${trip.driver_Description ? `
                    <div class="mt-3 pt-3 border-t border-gray-200">
                        <div class="flex items-center text-xs text-gray-500">
                            <i data-lucide="user" class="w-3 h-3 mr-1"></i>
                            Driver: <span class="ml-1 font-semibold text-gray-700">${trip.driver_Description}</span>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Click to view route hint -->
                <div class="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center text-blue-600 text-sm">
                    <i data-lucide="map" class="w-4 h-4 mr-2"></i>
                    Click to view route on map
                </div>
            </div>
        `;
    }).join('');
    
    // Re-initialize icons
    lucide.createIcons();
    
    // Add click handlers to trip cards
    const tripCards = document.querySelectorAll('.trip-card');
    tripCards.forEach((card, index) => {
        card.addEventListener('click', () => {
            const trip = trips[index];
            plotTripRoute(trip);
        });
    });
}

// Reports Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Period selector change
    const periodSelect = document.getElementById('reportPeriodSelect');
    const customDateRange = document.getElementById('customDateRange');
    
    if (periodSelect) {
        periodSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customDateRange.classList.remove('hidden');
            } else {
                customDateRange.classList.add('hidden');
            }
        });
    }
    
    // Clear Route button
    const clearRouteBtn = document.getElementById('clearRouteBtn');
    if (clearRouteBtn) {
        clearRouteBtn.addEventListener('click', () => {
            // Clear route polyline
            if (currentTripPolyline) {
                map.removeLayer(currentTripPolyline);
                currentTripPolyline = null;
            }
            
            // Clear route markers
            currentTripMarkers.forEach(marker => map.removeLayer(marker));
            currentTripMarkers = [];
            
            // Reset map height
            document.getElementById('map').style.height = '100vh';
            
            // Reset reports panel to full screen
            const reportsPanel = document.getElementById('reportsPanel');
            reportsPanel.style.top = '0';
            reportsPanel.style.height = '100%';
            
            // Hide clear route button
            clearRouteBtn.classList.add('hidden');
            
            // Invalidate map size to fix rendering
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
            
            debugLog('✅ Route cleared');
        });
    }
    
    // Show Trips button
    const showTripsBtn = document.getElementById('showTripsBtn');
    if (showTripsBtn) {
        showTripsBtn.addEventListener('click', async () => {
            const vehicleId = document.getElementById('reportVehicleSelect').value;
            const period = document.getElementById('reportPeriodSelect').value;
            
            if (!vehicleId) {
                alert('Please select a vehicle');
                return;
            }
            
            let startDate, endDate;
            
            if (period === 'custom') {
                const startInput = document.getElementById('startDate').value;
                const endInput = document.getElementById('endDate').value;
                
                if (!startInput || !endInput) {
                    alert('Please select both start and end dates');
                    return;
                }
                
                startDate = new Date(startInput + 'T00:00:00');
                endDate = new Date(endInput + 'T23:59:59');
            } else {
                const range = getDateRange(period);
                if (!range) {
                    alert('Invalid period selected');
                    return;
                }
                startDate = range.startDate;
                endDate = range.endDate;
            }
            
            // Show loading
            const loading = document.getElementById('tripsLoading');
            const tripsList = document.getElementById('tripsList');
            loading.classList.remove('hidden');
            tripsList.innerHTML = '';
            
            try {
                const trips = await fetchTrips(vehicleId, startDate, endDate);
                debugLog(`✅ Fetched ${trips.length} trips`);
                displayTrips(trips);
            } catch (error) {
                alert('Failed to load trips. Please try again.');
                debugError('Error loading trips:', error);
            } finally {
                loading.classList.add('hidden');
            }
        });
    }
});

// ===== SETTINGS BLADE FUNCTIONALITY =====

/**
 * Open the Settings blade
 */
function openSettingsBlade() {
    const blade = document.getElementById('settingsBlade');
    const panel = document.getElementById('settingsPanel');
    
    blade.classList.remove('hidden');
    
    // Trigger animation after a small delay for smooth transition
    setTimeout(() => {
        panel.classList.remove('-translate-x-full');
    }, 10);
    
    // Re-initialize Lucide icons
    lucide.createIcons();
}

/**
 * Close the Settings blade
 */
function closeSettingsBlade() {
    const blade = document.getElementById('settingsBlade');
    const panel = document.getElementById('settingsPanel');
    
    panel.classList.add('-translate-x-full');
    
    // Hide after animation completes
    setTimeout(() => {
        blade.classList.add('hidden');
    }, 300);
}

// Settings Blade Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Close button
    const closeBtn = document.getElementById('closeSettingsBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSettingsBlade);
    }
    
    // Close when clicking overlay
    const overlay = document.getElementById('settingsOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSettingsBlade);
    }
    
    // Account menu item
    const accountBtn = document.getElementById('settingsAccount');
    if (accountBtn) {
        accountBtn.addEventListener('click', () => {
            debugLog('Account settings clicked');
            openAccountPanel();
        });
    }
    
    // Devices menu item
    const devicesBtn = document.getElementById('settingsDevices');
    if (devicesBtn) {
        devicesBtn.addEventListener('click', () => {
            debugLog('Devices settings clicked');
            openDevicesPanel();
        });
    }
    
    // Alerts menu item
    const alertsBtn = document.getElementById('settingsAlerts');
    if (alertsBtn) {
        alertsBtn.addEventListener('click', () => {
            debugLog('Alerts settings clicked');
            openAlertsPanel();
        });
    }
    
    // About menu item
    const aboutBtn = document.getElementById('settingsAbout');
    if (aboutBtn) {
        aboutBtn.addEventListener('click', () => {
            debugLog('About clicked');
            alert('BLE Tracker v1.0\\n\\nDeveloped by ScopeTech\\n© 2026 All rights reserved');
        });
    }
    
    // ===== ACCOUNT PANEL EVENT LISTENERS =====
    
    // Load saved account data
    loadAccountData();
    
    // Back button
    const backFromAccount = document.getElementById('backFromAccount');
    if (backFromAccount) {
        backFromAccount.addEventListener('click', closeAccountPanel);
    }
    
    // Save account button
    const saveAccountBtn = document.getElementById('saveAccountBtn');
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', saveAccountData);
    }
    
    // Save preferences button
    const savePreferencesBtn = document.getElementById('savePreferencesBtn');
    if (savePreferencesBtn) {
        savePreferencesBtn.addEventListener('click', savePreferences);
    }
    
    // Delete account button
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', deleteAccount);
    }
    
    // ===== DEVICES PANEL EVENT LISTENERS =====
    
    // Back button
    const backFromDevices = document.getElementById('backFromDevices');
    if (backFromDevices) {
        backFromDevices.addEventListener('click', closeDevicesPanel);
    }
    
    // Export devices button
    const exportDevicesBtn = document.getElementById('exportDevicesBtn');
    if (exportDevicesBtn) {
        exportDevicesBtn.addEventListener('click', exportDevicesToExcel);
    }
    
    // ===== ALERTS PANEL EVENT LISTENERS =====
    
    // Back button
    const backFromAlerts = document.getElementById('backFromAlerts');
    if (backFromAlerts) {
        backFromAlerts.addEventListener('click', closeAlertsPanel);
    }
    
    // ===== ACCOUNT POPUP EVENT LISTENERS =====
    
    // Account option in popup
    const accountPopupAccount = document.getElementById('accountPopupAccount');
    if (accountPopupAccount) {
        accountPopupAccount.addEventListener('click', () => {
            closeAccountPopup();
            openAccountPanel();
        });
    }
    
    // Logout option in popup
    const accountPopupLogout = document.getElementById('accountPopupLogout');
    if (accountPopupLogout) {
        accountPopupLogout.addEventListener('click', handleLogout);
    }
    
    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('accountPopup');
        const accountNav = document.getElementById('navAccount');
        
        if (popup && !popup.contains(e.target) && accountNav && !accountNav.contains(e.target)) {
            closeAccountPopup();
        }
    });
});

// ===== ACCOUNT PANEL FUNCTIONS =====

/**
 * Open Account Settings Panel
 */
function openAccountPanel() {
    const panel = document.getElementById('accountPanel');
    panel.classList.remove('hidden');
    closeSettingsBlade();
    lucide.createIcons();
}

/**
 * Close Account Settings Panel
 */
function closeAccountPanel() {
    const panel = document.getElementById('accountPanel');
    panel.classList.add('hidden');
}

/**
 * Load account data from localStorage
 */
function loadAccountData() {
    try {
        const accountData = JSON.parse(localStorage.getItem('accountData') || '{}');
        const mapProvider = localStorage.getItem('mapProvider') || 'google';
        
        if (accountData.name) document.getElementById('accountName').value = accountData.name;
        if (accountData.email) document.getElementById('accountEmail').value = accountData.email;
        document.getElementById('mapProviderSelect').value = mapProvider;
    } catch (error) {
        debugError('Failed to load account data:', error);
    }
}

/**
 * Save account data to localStorage
 */
function saveAccountData() {
    const name = document.getElementById('accountName').value.trim();
    const email = document.getElementById('accountEmail').value.trim();
    const password = document.getElementById('accountPassword').value;
    
    if (!name || !email) {
        alert('Please fill in all required fields');
        return;
    }
    
    const accountData = { name, email };
    
    if (password) {
        // In a real app, this would be sent to backend
        debugLog('Password would be updated securely');
        accountData.passwordUpdated = new Date().toISOString();
    }
    
    localStorage.setItem('accountData', JSON.stringify(accountData));
    
    // Clear password field
    document.getElementById('accountPassword').value = '';
    
    alert('Account settings saved successfully!');
    debugLog('✅ Account data saved');
}

/**
 * Save preferences
 */
function savePreferences() {
    const mapProvider = document.getElementById('mapProviderSelect').value;
    localStorage.setItem('mapProvider', mapProvider);
    
    alert('Preferences saved! Map provider will be applied on next load.');
    debugLog(`✅ Map provider preference saved: ${mapProvider}`);
}

/**
 * Delete account
 */
function deleteAccount() {
    const confirmation = prompt('This action cannot be undone. Type \"DELETE\" to confirm:');
    
    if (confirmation === 'DELETE') {
        // Clear all data
        localStorage.clear();
        
        // Clear tracked tags
        trackedTags.forEach((tag, imei) => removeMarker(imei));
        trackedTags.clear();
        
        alert('Account deleted. All data has been cleared.');
        debugLog('🗑️ Account deleted');
        
        closeAccountPanel();
    } else {
        alert('Account deletion cancelled');
    }
}

// ===== DEVICES PANEL FUNCTIONS =====

/**
 * Open Devices Panel
 */
function openDevicesPanel() {
    const panel = document.getElementById('devicesPanel');
    panel.classList.remove('hidden');
    closeSettingsBlade();
    populateDevicesList();
    lucide.createIcons();
}

/**
 * Close Devices Panel
 */
function closeDevicesPanel() {
    const panel = document.getElementById('devicesPanel');
    panel.classList.add('hidden');
}

/**
 * Populate devices list
 */
function populateDevicesList() {
    const devicesList = document.getElementById('devicesList');
    
    if (trackedTags.size === 0) {
        devicesList.innerHTML = `
            <div class="text-center py-12">
                <i data-lucide="smartphone-off" class="w-16 h-16 text-gray-300 mx-auto mb-3"></i>
                <p class="text-gray-500 font-medium">No devices tracked</p>
                <p class="text-sm text-gray-400 mt-1">Add devices from the map view</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    devicesList.innerHTML = Array.from(trackedTags.values()).map(tag => `
        <div class="bg-white rounded-lg shadow-md p-4 border-2 border-gray-200 hover:border-green-300 transition">
            <div class="flex items-center gap-3">
                <div class="bg-green-100 p-3 rounded-lg flex-shrink-0">
                    <i data-lucide="smartphone" class="w-6 h-6 text-green-600"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-gray-800 mb-1">${tag.description || 'Unnamed Device'}</h4>
                    <p class="text-sm text-gray-500 font-mono truncate">${tag.imei}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
}

/**
 * Export devices to Excel
 */
function exportDevicesToExcel() {
    if (trackedTags.size === 0) {
        alert('No devices to export');
        return;
    }
    
    // Prepare data for export
    const data = Array.from(trackedTags.values()).map(tag => ({
        'Description': tag.description || 'Unnamed Device',
        'Identifier/IMEI': tag.imei,
        'Date Added': new Date().toLocaleDateString()
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
        { wch: 30 }, // Description
        { wch: 40 }, // Identifier/IMEI
        { wch: 15 }  // Date Added
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'BLE Devices');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `BLE_Devices_${timestamp}.xlsx`;
    
    // Download
    XLSX.writeFile(wb, filename);
    
    debugLog(`✅ Exported ${trackedTags.size} devices to ${filename}`);
    alert(`Exported ${trackedTags.size} devices to ${filename}`);
}

// ===== ALERTS PANEL FUNCTIONS =====

/**
 * Open Alerts Panel
 */
function openAlertsPanel() {
    const panel = document.getElementById('alertsPanel');
    panel.classList.remove('hidden');
    closeSettingsBlade();
    lucide.createIcons();
}

/**
 * Close Alerts Panel
 */
function closeAlertsPanel() {
    const panel = document.getElementById('alertsPanel');
    panel.classList.add('hidden');
}

// ===== ACCOUNT POPUP FUNCTIONS =====

/**
 * Toggle Account Popup Menu
 */
function toggleAccountPopup() {
    const popup = document.getElementById('accountPopup');
    
    if (popup.classList.contains('hidden')) {
        popup.classList.remove('hidden');
        lucide.createIcons();
    } else {
        popup.classList.add('hidden');
    }
}

/**
 * Close Account Popup Menu
 */
function closeAccountPopup() {
    const popup = document.getElementById('accountPopup');
    popup.classList.add('hidden');
}

/**
 * Handle Logout
 */
function handleLogout() {
    const confirmation = confirm('Are you sure you want to logout?');
    
    if (confirmation) {
        // Clear authentication token
        authToken = null;
        tokenExpiration = null;
        
        // Clear token refresh timer
        if (tokenRefreshTimer) {
            clearTimeout(tokenRefreshTimer);
            tokenRefreshTimer = null;
        }
        
        // Clear all tracked tags from map
        trackedTags.forEach((tag, imei) => removeMarker(imei));
        trackedTags.clear();
        
        // Clear localStorage (saved tags)
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        
        // Close popup
        closeAccountPopup();
        
        // Show success message
        alert('You have been logged out successfully!');
        
        debugLog('🔓 User logged out');
        
        // Refresh the page to reset everything
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    
    // Clear token refresh timer
    if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
        tokenRefreshTimer = null;
        debugLog('🛑 Token refresh timer cleared');
    }
});
