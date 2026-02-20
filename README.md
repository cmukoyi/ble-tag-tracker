# BLE Tag Tracker 🏷️

A production-ready Progressive Web App (PWA) for real-time tracking of BLE tags and vehicles with Google Maps/OpenStreetMap integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🗺️ **Real-time Location Tracking** - View vehicle locations on interactive maps
- 🌍 **Multiple Map Providers** - Toggle between Google Maps and OpenStreetMap
- 📱 **Mobile-First PWA** - Install as a native app on mobile devices
- 🚗 **Live Vehicle Data** - Real-time updates via mzone API integration
- 🎯 **Smart Markers** - Color-coded status indicators (Green = Ignition ON, Red = OFF)
- 📍 **Address Resolution** - Automatic address display from coordinates
- 📷 **QR Code Scanner** - Quick vehicle enrollment via QR scanning
- 🔐 **Secure Authentication** - OAuth 2.0 token-based API access
- 💾 **Offline Support** - Service worker caching for offline functionality
- 📊 **Data Export** - Export vehicle data to Excel/CSV formats
- 🔄 **Auto-refresh** - Configurable automatic data updates
- 📱 **Share Location** - Share vehicle locations via native sharing

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Git
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/cmukoyi/ble-tag-tracker.git
   cd ble-tag-tracker
   ```

2. **Set up environment**
   ```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate (Windows)
   .\venv\Scripts\activate
   
   # Activate (Linux/Mac)
   source venv/bin/activate
   
   # Install dependencies
   pip install -r backend/requirements.txt
   ```

3. **Configure credentials**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your OAuth credentials
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access the app**
   - Open browser to `http://localhost:5000`
   - For mobile access: `http://YOUR_IP:5000`

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## ☁️ Production Deployment

### Linux Server

See [LINUX_DEPLOY.md](LINUX_DEPLOY.md) for detailed Linux deployment instructions including:
- Systemd service setup
- Nginx reverse proxy configuration
- SSL with Let's Encrypt
- Firewall configuration

### Cloud Platforms

**Heroku:**
```bash
heroku create your-app-name
git push heroku main
```

**Docker Hub:**
```bash
docker build -t your-username/ble-tag-tracker .
docker push your-username/ble-tag-tracker
```

## 📁 Project Structure

```
ble-tag-tracker/
├── backend/
│   ├── app.py              # Flask backend server
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment template
│   └── .gitignore
├── js/
│   ├── map.js             # Main application logic
│   └── scanner.js         # QR code scanner
├── css/
│   └── style.css          # Application styles
├── icons/                 # PWA icons
├── index.html            # Main HTML file
├── manifest.json         # PWA manifest
├── service-worker.js     # Service worker for offline support
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

Create a `backend/.env` file with your credentials:

```env
# OAuth Configuration
TOKEN_URL=https://login.mzoneweb.net/connect/token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
OAUTH_USERNAME=your_username
OAUTH_PASSWORD=your_password
SCOPE=mz6-api.all mz_username
GRANT_TYPE=password
RESPONSE_TYPE=code id_token

# Server Configuration
FLASK_ENV=production
HOST=0.0.0.0
PORT=5000
DEBUG=False
```

### Frontend Configuration

Edit `js/map.js` for frontend settings:
- Map provider (Google Maps / OpenStreetMap)
- Refresh intervals
- Debug mode
- Backend URL

## 🛠️ Technology Stack

**Backend:**
- Flask 3.0 - Python web framework
- Flask-CORS - Cross-origin resource sharing
- Requests - HTTP library
- Gunicorn - WSGI HTTP server

**Frontend:**
- Vanilla JavaScript (ES6+)
- Leaflet.js - Interactive maps
- Google Maps API - Alternative map provider
- Lucide Icons - Icon library
- SheetJS - Excel export functionality

**Infrastructure:**
- Docker & Docker Compose
- Nginx (optional reverse proxy)
- Let's Encrypt (SSL certificates)

## 📱 PWA Features

- **Installable** - Add to home screen on mobile and desktop
- **Offline capable** - Service worker caching
- **Responsive** - Mobile-first design
- **Fast** - Optimized performance
- **Secure** - HTTPS required in production

## 🔐 Security

- ✅ OAuth credentials stored in `.env` (never committed)
- ✅ CORS protection
- ✅ Token-based authentication
- ✅ Secure HTTPS in production
- ✅ Environment variable validation
- ✅ Input sanitization

## 📄 API Integration

This app integrates with the **mzone API** for vehicle tracking:
- OAuth 2.0 authentication
- Real-time vehicle location data
- Historical route information
- Device management

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Backend won't start
- Check that `.env` file exists in `backend/` directory
- Verify all required environment variables are set
- Ensure Python dependencies are installed: `pip install -r backend/requirements.txt`

### OAuth errors
- Verify credentials in `.env` are correct
- Check that `OAUTH_USERNAME` and `OAUTH_PASSWORD` variables are properly named (not `USERNAME` or `PASSWORD`)
- Ensure token endpoint is accessible

### Mobile access issues
- Verify backend is listening on `0.0.0.0` not `127.0.0.1`
- Check firewall allows port 5000
- Use IP address instead of localhost on mobile

### Map not loading
- Check browser console for errors
- Verify Google Maps API key (if using Google Maps)
- Try switching to OpenStreetMap in settings

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in the repository

## 🔗 Links

- **Repository:** https://github.com/cmukoyi/ble-tag-tracker
- **Linux Deployment Guide:** [LINUX_DEPLOY.md](LINUX_DEPLOY.md)
- **Production Checklist:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

---

**Built with ❤️ for real-time vehicle tracking**
