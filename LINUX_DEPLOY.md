# Linux Deployment Guide

Quick guide to deploy BLE Tag Tracker on a Linux server.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Python 3.8+
- Git
- sudo access

## Quick Deploy

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/ble-tag-tracker.git
cd ble-tag-tracker
```

### 2. Install Python Dependencies

```bash
# Install Python 3 and pip if not already installed
sudo apt update
sudo apt install python3 python3-pip python3-venv -y

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Configure Environment

```bash
# Copy and edit .env file
cd backend
cp .env.example .env
nano .env  # or use vim/vi
```

**Important:** Update these values in `.env`:
```env
OAUTH_USERNAME=your_oauth_username
OAUTH_PASSWORD=your_oauth_password
CLIENT_SECRET=your_client_secret
DEBUG=False
```

### 4. Test the Application

```bash
# From the backend directory
python app.py
```

Visit `http://YOUR_SERVER_IP:5000` to test.

Press `Ctrl+C` to stop.

### 5. Production Deployment with Gunicorn

#### Option A: Direct Gunicorn

```bash
# From backend directory
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

#### Option B: Systemd Service (Recommended)

Create a systemd service for auto-start:

```bash
sudo nano /etc/systemd/system/ble-tracker.service
```

Add this content (adjust paths):

```ini
[Unit]
Description=BLE Tag Tracker API
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/ble-tag-tracker/backend
Environment="PATH=/home/YOUR_USERNAME/ble-tag-tracker/venv/bin"
ExecStart=/home/YOUR_USERNAME/ble-tag-tracker/venv/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ble-tracker
sudo systemctl start ble-tracker
sudo systemctl status ble-tracker
```

### 6. Configure Firewall

```bash
# Allow port 5000
sudo ufw allow 5000/tcp
sudo ufw status
```

### 7. Set Up Nginx (Optional - for HTTPS)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/ble-tracker
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/ble-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. SSL with Let's Encrypt (Optional)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## Docker Deployment (Alternative)

If you prefer Docker:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Deploy
cd ble-tag-tracker
docker-compose up -d
```

## Troubleshooting

### Check logs
```bash
# Systemd service
sudo journalctl -u ble-tracker -f

# Docker
docker-compose logs -f
```

### Port already in use
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill it
sudo kill -9 PID
```

### Permission denied
```bash
# Make sure scripts are executable
chmod +x deploy_production.sh
chmod +x backend/app.py
```

## Accessing the App

- **Local:** http://localhost:5000
- **Network:** http://YOUR_SERVER_IP:5000
- **Domain:** http://your-domain.com (if Nginx configured)

## Management Commands

```bash
# Check service status
sudo systemctl status ble-tracker

# View logs
sudo journalctl -u ble-tracker -f

# Restart service
sudo systemctl restart ble-tracker

# Stop service
sudo systemctl stop ble-tracker
```

## Security Notes

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Set DEBUG=False** in production
3. **Use HTTPS** in production (Nginx + Let's Encrypt)
4. **Change default credentials** immediately
5. **Keep dependencies updated:** `pip install -r requirements.txt --upgrade`

## Next Steps

1. Configure your domain DNS to point to server IP
2. Set up SSL certificate
3. Configure backup strategy
4. Set up monitoring (optional)

For more details, see [README_PRODUCTION.md](README_PRODUCTION.md)
