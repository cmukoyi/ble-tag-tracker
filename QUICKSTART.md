# 🚀 Quick Start - BLE Tag Tracker with Admin Portal

## Complete Docker Setup

Everything is dockerized and ready to use!

## Start the Application

```powershell
cd C:\Users\Carlos Mukoyi\Documents\code\FunTools\bleTags
docker-compose up --build
```

## Access Points

| Feature | URL | Credentials |
|---------|-----|-------------|
| 🔐 **Admin Portal** | `http://localhost:5000/admin` | [See .env file] |
| 📱 User Login | `http://localhost:5000/login.html` | Email + PIN code |
| 🏠 Main App | `http://localhost:5000/index.html` | After login |

## Get PIN Codes

**PINs display in the terminal where you ran docker-compose!**

When a user enters their email, you'll see:
```
============================================================
📧 EMAIL PIN for test@example.com: 123456
============================================================
```

## Admin Portal Features

### ✅ Included in Docker:
- User management and statistics
- IMEI tracking per user
- Billing configuration (cost per user, currency)
- Monthly revenue calculations
- Excel export (download billing reports)

### Dashboard Shows:
- Total users
- Cost per user
- Monthly revenue
- Total IMEIs across all users

### You Can:
- View all registered users
- Add/remove IMEIs for any user
- Change billing rates in real-time
- Export detailed billing statements to Excel
- Monitor user registration and login dates

## Test It Out

### 1. Test User Registration:
- Go to: `http://localhost:5000/login.html`
- Enter email: `test@example.com`
- Get PIN from terminal
- Complete registration with name

### 2. Test Admin Portal:
- Go to: `http://localhost:5000/admin`
- Login: [Check your .env file for credentials]
- See user in dashboard
- Click "Manage IMEIs" → Add IMEI: `867747079036032`
- Export to Excel to see report

### 3. Test Billing Settings:
- Click "Billing Settings"
- Set cost: 15.00 USD
- Save → Monthly revenue updates automatically

## Stop the Container

```powershell
# Stop and remove
docker-compose down

# Or just stop (keeps data in memory)
docker-compose stop
```

## View Logs (if running in background)

```powershell
docker logs ble-tag-tracker -f
```

## Troubleshooting

**Port 5000 in use?**
```powershell
docker-compose down
# Kill any python processes
Get-Process python | Stop-Process
docker-compose up
```

**Can't see PINs?**
- Make sure you're NOT running with `-d` flag
- Or use: `docker logs ble-tag-tracker -f`

**Changes not showing?**
```powershell
docker-compose down
docker-compose up --build
```

## 📚 Full Documentation

- [ADMIN_DOCKER.md](ADMIN_DOCKER.md) - Complete admin setup guide
- [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Docker commands and tips
- [ADMIN_README.md](ADMIN_README.md) - Admin features and API reference

---

**Everything is ready! The admin billing portal is fully integrated into Docker.** 🎉

Access it at: **`http://localhost:5000/admin`** (credentials in .env file)
