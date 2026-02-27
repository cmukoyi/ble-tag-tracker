# Admin Billing Module - Docker Setup

## ✅ Admin Portal is Fully Dockerized!

The admin billing module is included in the Docker container and ready to use.

## 🚀 Quick Start

### 1. Build and Start the Container
```powershell
cd C:\Users\Carlos Mukoyi\Documents\code\FunTools\bleTags
docker-compose up --build
```

### 2. Access the Admin Portal
Open your browser: **`http://localhost:5000/admin`**

**Login Credentials:**
- Username: `admin`
- Password: `admin123`

## 📊 What's Included in Docker

The Docker container includes:
- ✅ User authentication system (login.html)
- ✅ Main application (index.html)
- ✅ **Admin login page** (admin-login.html)
- ✅ **Admin dashboard** (admin-dashboard.html)
- ✅ All backend API routes for billing
- ✅ Excel export functionality (openpyxl installed)
- ✅ User and IMEI management
- ✅ Billing configuration and calculations

## 🔍 Viewing Console Output (PIN Codes)

The container runs in **development mode** by default (`DEBUG=True` in docker-compose.yml).

**To see PIN codes when users login:**

```powershell
# If running in foreground (docker-compose up)
# PINs appear directly in the terminal

# If running in background (docker-compose up -d)
docker logs ble-tag-tracker -f
```

You'll see output like:
```
============================================================
📧 EMAIL PIN for test@example.com: 123456
============================================================
```

## 🌐 Access Points

Once the container is running:

| Page | URL | Description |
|------|-----|-------------|
| **Admin Portal** | `http://localhost:5000/admin` | Billing management dashboard |
| User Login | `http://localhost:5000/login.html` | User authentication |
| Main App | `http://localhost:5000/index.html` | BLE Tag Tracker interface |
| Health Check | `http://localhost:5000/api/health` | API status |

## 🛠️ Development vs Production Mode

### Development Mode (Current Setup)
```yaml
# docker-compose.yml
environment:
  - DEBUG=True
```
- Uses Flask development server
- Shows detailed console output
- PIN codes printed to logs
- Auto-reload on code changes (if volume mounted)

### Production Mode
```yaml
# docker-compose.yml
environment:
  - DEBUG=False
```
- Uses Gunicorn with 4 workers
- Optimized for performance
- Configure email settings to send actual emails
- No PIN codes in console (sent via email)

## 📧 Email Configuration for Production

Edit `backend/.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

When configured, users receive PIN codes via email instead of console.

## 🔐 Admin Features in Docker

All admin features work in Docker:

### 1. **User Management**
- View all registered users
- See registration and login dates
- View user statistics

### 2. **IMEI Tracking**
- Add IMEIs to user accounts
- View IMEI addition dates
- Remove IMEIs from accounts

### 3. **Billing Management**
- Set cost per user
- Choose currency (USD/EUR/GBP/ZAR)
- Calculate monthly revenue
- Real-time billing calculations

### 4. **Excel Export**
- Download comprehensive billing statements
- Includes all users and their IMEIs
- Professional formatting
- Date stamped reports

## 🧪 Testing the Admin Portal

### Quick Test Steps:
1. Start container: `docker-compose up`
2. Go to: `http://localhost:5000/admin`
3. Login with admin/admin123
4. You should see the dashboard with stats

### Test User Registration:
1. Open: `http://localhost:5000/login.html`
2. Enter email: `test@example.com`
3. Check terminal for PIN code
4. Enter PIN and complete registration
5. Refresh admin dashboard to see new user

### Test IMEI Management:
1. In admin dashboard, click "Manage IMEIs" for a user
2. Add IMEI: `867747079036032`
3. IMEI appears in user's account
4. Total IMEIs count updates

### Test Billing Configuration:
1. Click "Billing Settings"
2. Change cost per user (e.g., 15.00)
3. Select currency (e.g., USD)
4. Save changes
5. Monthly revenue updates automatically

### Test Excel Export:
1. Click "Export to Excel"
2. File downloads: `billing_statement_YYYYMMDD_HHMMSS.xlsx`
3. Open file to verify data

## 🐛 Troubleshooting

### Admin page shows 404
```powershell
# Rebuild with latest changes
docker-compose down
docker-compose up --build
```

### Can't login to admin portal
- Verify credentials: admin/admin123
- Check browser console for errors
- Check container logs: `docker logs ble-tag-tracker`

### Excel export fails
```powershell
# Verify openpyxl is installed in container
docker exec -it ble-tag-tracker pip list | grep openpyxl

# Should show: openpyxl  3.0.10
```

### No users showing in admin dashboard
- Make sure at least one user has registered through login.html
- Check API response: `http://localhost:5000/api/admin/users` (requires auth)

### Container won't start
```powershell
# Check logs for errors
docker-compose logs

# Common fixes:
# 1. Port 5000 in use - stop other services
# 2. Missing .env file - copy backend/.env.example to backend/.env
# 3. Build cache issue - rebuild with --no-cache
docker-compose build --no-cache
docker-compose up
```

## 📦 What Gets Built into Docker Image

```
/app/
├── backend/
│   ├── app.py              # Main Flask app with admin routes
│   ├── requirements.txt    # Dependencies (includes openpyxl)
│   └── .env               # Configuration
├── admin-login.html        # ✅ Admin login page
├── admin-dashboard.html    # ✅ Admin dashboard
├── login.html             # User authentication
├── index.html             # Main application
├── assets/                # Logo and images
├── icons/                 # PWA icons
└── entrypoint.sh          # Startup script

API Routes Included:
- POST /api/admin/login
- GET  /api/admin/users
- POST /api/admin/user/<email>/imeis
- DELETE /api/admin/user/<email>/imeis/<imei>
- GET  /api/admin/billing/config
- PUT  /api/admin/billing/config
- GET  /api/admin/billing/calculate
- GET  /api/admin/billing/export
```

## 🔒 Security Note

The current setup uses hardcoded credentials (admin/admin123) for development.

**For production:**
1. Move credentials to environment variables
2. Use strong passwords
3. Implement JWT-based sessions
4. Enable HTTPS
5. Add rate limiting
6. Use a proper database (PostgreSQL/MySQL)

## 🔄 Updating Admin Features

After making code changes:

```powershell
# Rebuild and restart
docker-compose down
docker-compose up --build
```

## 📈 Monitoring in Production

```powershell
# View container stats
docker stats ble-tag-tracker

# Check health status
curl http://localhost:5000/api/health

# Export logs
docker logs ble-tag-tracker > admin-logs.txt

# Monitor in real-time
docker logs ble-tag-tracker -f --tail=100
```

## ✅ Verification Checklist

- [ ] Container builds successfully
- [ ] Admin portal accessible at http://localhost:5000/admin
- [ ] Login with admin/admin123 works
- [ ] Dashboard shows statistics
- [ ] Can add/remove IMEIs for users
- [ ] Billing settings can be changed
- [ ] Excel export downloads successfully
- [ ] PIN codes visible in docker logs
- [ ] Users can register through login.html

---

**The admin billing module is fully integrated into Docker and ready for use!** 🎉
