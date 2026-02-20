# BLE Tag Tracker 🏷️

Production-ready Progressive Web App for real-time tracking of BLE tags and vehicles.

## ✨ Features

- 🗺️ Real-time location tracking on interactive maps
- 📱 Mobile-first PWA with offline support
- 🚗 Live vehicle data via mzone API
- 🎯 Color-coded ignition status markers
- 📷 QR code scanner for quick enrollment
- 🔐 OAuth 2.0 authentication
- 📊 Excel/CSV data export

## 🚀 Deployment

## 🚀 Deployment

**See [LINUX_DEPLOY.md](LINUX_DEPLOY.md) for complete production deployment guide** including:
- Linux server setup with systemd
- Nginx reverse proxy & SSL
- Docker deployment
- Firewall configuration

### Quick Start (Development)

```bash
# Clone repository
git clone https://github.com/cmukoyi/ble-tag-tracker.git
cd ble-tag-tracker

# Install dependencies
python -m venv venv
source venv/bin/activate  # Linux/Mac
# OR: .\venv\Scripts\activate  # Windows
pip install -r backend/requirements.txt

# Configure environment
cd backend
cp .env.example .env
# Edit .env with your OAuth credentials

# Run
python app.py
# Access at http://localhost:5000
```

## 🔧 Configuration

Create `backend/.env`:

```env
TOKEN_URL=https://login.mzoneweb.net/connect/token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
OAUTH_USERNAME=your_username
OAUTH_PASSWORD=your_password
DEBUG=False
```

## 📁 Structure

```
backend/          # Flask API server
js/              # Frontend JavaScript
css/             # Styles
icons/           # PWA icons
Dockerfile       # Docker configuration
```

## 🛠️ Tech Stack

- **Backend:** Flask, Gunicorn
- **Frontend:** Vanilla JS, Leaflet.js, Google Maps
- **Infrastructure:** Docker, Nginx

## �️ Tech Stack

- **Backend:** Flask, Gunicorn
- **Frontend:** Vanilla JS, Leaflet.js, Google Maps
- **Infrastructure:** Docker, Nginx

## 🔐 Security

- OAuth credentials in `.env` (gitignored)
- Token-based authentication
- CORS protection
- HTTPS in production

## 🐛 Common Issues

**OAuth 400 errors:** Check `OAUTH_USERNAME` and `OAUTH_PASSWORD` in `.env` (not `USERNAME`/`PASSWORD` - Windows conflict)

**Mobile access:** Backend must listen on `0.0.0.0`, open port 5000 in firewall

**See [LINUX_DEPLOY.md](LINUX_DEPLOY.md) for detailed troubleshooting**

---

Built for real-time vehicle tracking | [Deploy Guide](LINUX_DEPLOY.md)

