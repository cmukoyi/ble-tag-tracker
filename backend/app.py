"""
Flask Backend for BLE Tag Tracker
Handles OAuth token fetching to bypass CORS restrictions
Production-ready with environment variable configuration
"""

from flask import Flask, jsonify, send_from_directory, make_response
from flask_cors import CORS
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='../.')

# Configure CORS for production
CORS(app, resources={r"/api/*": {"origins": "*"}})

# OAuth Configuration from environment variables
TOKEN_URL = os.getenv('TOKEN_URL', 'https://login.mzoneweb.net/connect/token')
CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
OAUTH_USERNAME = os.getenv('OAUTH_USERNAME')
OAUTH_PASSWORD = os.getenv('OAUTH_PASSWORD')
SCOPE = os.getenv('SCOPE', 'mz6-api.all mz_username')
GRANT_TYPE = os.getenv('GRANT_TYPE', 'password')
RESPONSE_TYPE = os.getenv('RESPONSE_TYPE', 'code id_token')

# Server Configuration
DEBUG_MODE = os.getenv('DEBUG', 'False').lower() == 'true'
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 5000))

# Validate required credentials
if not all([CLIENT_ID, CLIENT_SECRET, OAUTH_USERNAME, OAUTH_PASSWORD]):
    raise ValueError('Missing required OAuth credentials in .env file')

# Token cache
token_cache = {
    'token': None,
    'expires_at': None
}


@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory('../', 'index.html')


@app.route('/manifest.json')
def manifest():
    """Serve PWA manifest with correct MIME type"""
    response = make_response(send_from_directory('../', 'manifest.json'))
    response.headers['Content-Type'] = 'application/manifest+json'
    return response


@app.route('/service-worker.js')
def service_worker():
    """Serve service worker with correct MIME type and no caching"""
    response = make_response(send_from_directory('../', 'service-worker.js'))
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, images)"""
    return send_from_directory('../', path)


@app.route('/api/token', methods=['GET'])
def get_token():
    """
    Fetch OAuth token from login.mzoneweb.net
    Returns cached token if still valid, otherwise fetches new one
    """
    try:
        # Check if cached token is still valid (with 5 min buffer)
        if token_cache['token'] and token_cache['expires_at']:
            if datetime.now() < token_cache['expires_at'] - timedelta(minutes=5):
                return jsonify({
                    'success': True,
                    'access_token': token_cache['token'],
                    'expires_in': int((token_cache['expires_at'] - datetime.now()).total_seconds()),
                    'cached': True
                })
        
        # Fetch new token
        if DEBUG_MODE:
            print("🔐 Fetching new OAuth token...")
        
        payload = {
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'username': OAUTH_USERNAME,
            'password': OAUTH_PASSWORD,
            'scope': SCOPE,
            'grant_type': GRANT_TYPE,
            'response_type': RESPONSE_TYPE
        }
        
        response = requests.post(
            TOKEN_URL,
            data=payload,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Cache the token
            token_cache['token'] = data['access_token']
            expires_in = data.get('expires_in', 3600)
            token_cache['expires_at'] = datetime.now() + timedelta(seconds=expires_in)
            
            if DEBUG_MODE:
                print(f"✅ Token obtained (expires in {expires_in}s)")
            
            return jsonify({
                'success': True,
                'access_token': data['access_token'],
                'expires_in': expires_in,
                'cached': False
            })
        else:
            error_detail = response.text
            if DEBUG_MODE:
                print(f"❌ Token fetch failed: {response.status_code}")
                print(f"📋 OAuth Error Response: {error_detail}")
                print(f"📤 Payload sent: client_id={CLIENT_ID}, username={OAUTH_USERNAME}")
            return jsonify({
                'success': False,
                'error': f'Token request failed: {response.status_code}',
                'detail': error_detail
            }), response.status_code
            
    except Exception as e:
        if DEBUG_MODE:
            print(f"❌ Exception: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    """
    Fetch all vehicles from mzone API
    Returns vehicle list with last known positions
    """
    try:
        # Get valid token
        token_response = get_token()
        if isinstance(token_response, tuple):
            # Error response
            return token_response
        
        token_data = token_response.get_json()
        if not token_data.get('success'):
            return jsonify({
                'success': False,
                'error': 'Failed to obtain access token'
            }), 401
        
        access_token = token_data['access_token']
        
        # Fetch vehicles with embedded positions from mzone API (using $expand)
        api_url = 'https://live.mzoneweb.net/mzone62.api/Vehicles?$format=json&$top=100&$expand=lastKnownPosition($select=longitude,latitude,eventType_Id,utcTimestamp,speed)'
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        if DEBUG_MODE:
            print(f"🚗 Fetching vehicles from mzone API...")
        
        response = requests.get(api_url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            vehicles_data = response.json()
            
            if DEBUG_MODE:
                print(f"✅ Found {len(vehicles_data.get('value', []))} vehicles")
            
            return jsonify({
                'success': True,
                'vehicles': vehicles_data
            })
        else:
            if DEBUG_MODE:
                print(f"❌ Failed to fetch vehicles: {response.status_code}")
            return jsonify({
                'success': False,
                'error': f'API request failed: {response.status_code}'
            }), response.status_code
            
    except Exception as e:
        if DEBUG_MODE:
            print(f"❌ Exception fetching vehicles: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'token_cached': token_cache['token'] is not None,
        'token_expires_at': token_cache['expires_at'].isoformat() if token_cache['expires_at'] else None
    })


if __name__ == '__main__':
    if DEBUG_MODE:
        print("=" * 60)
        print("🚀 BLE Tag Tracker Backend Server")
        print("=" * 60)
        print(f"📱 Frontend: http://{HOST if HOST != '0.0.0.0' else 'localhost'}:{PORT}")
        print(f"🔑 Token API: http://{HOST if HOST != '0.0.0.0' else 'localhost'}:{PORT}/api/token")
        print(f"❤️  Health Check: http://{HOST if HOST != '0.0.0.0' else 'localhost'}:{PORT}/api/health")
        print(f"🔧 Mode: {'DEBUG' if DEBUG_MODE else 'PRODUCTION'}")
        print("=" * 60)
        print("✅ Server starting...")
        print()
    
    app.run(
        host=HOST,
        port=PORT,
        debug=DEBUG_MODE
    )
