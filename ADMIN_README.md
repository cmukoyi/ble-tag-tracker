# Admin Portal - BLE Tag Tracker

## Overview
The admin portal provides billing management and user tracking capabilities for the BLE Tag Tracker application.

## Access

**URL:** `http://127.0.0.1:5000/admin`

**Credentials:**
- Username: `admin`
- Password: `[Set in .env file]`

## Features

### 1. Dashboard Overview
The main dashboard displays:
- **Total Users** - Number of registered users
- **Cost per User** - Monthly billing rate per user
- **Monthly Revenue** - Total calculated monthly revenue
- **Total IMEIs** - Total number of registered devices across all users

### 2. User Management
- View all registered users with their details:
  - Email address
  - Account creation date
  - Last login date
  - Number of IMEIs linked to their account
- Manage IMEIs for each user

### 3. IMEI Management
For each user, you can:
- **Add IMEIs** - Link device IMEIs to user accounts
- **View IMEI Details** - See when each IMEI was added
- **Remove IMEIs** - Unlink devices from user accounts

### 4. Billing Configuration
- Set the monthly cost per user
- Select currency (USD, EUR, GBP, ZAR)
- Changes apply immediately to billing calculations

### 5. Excel Export
Generate comprehensive billing statements with:
- Summary (total users, cost per user, total revenue)
- Detailed user list with all IMEIs
- Date information for auditing
- Professional formatting

## How to Use

### Accessing the Admin Portal
1. Ensure the backend server is running: `python app.py`
2. Navigate to `http://127.0.0.1:5000/admin`
3. Login with configured credentials from .env

### Managing User IMEIs
1. Click **"Manage IMEIs"** next to any user
2. Enter the IMEI number in the input field
3. Click **"Add"** to link the device
4. To remove: click the trash icon next to any IMEI

### Adjusting Billing Rates
1. Click **"Billing Settings"** button
2. Enter the new cost per user
3. Select the currency
4. Click **"Save Changes"**

### Exporting Reports
1. Click **"Export to Excel"** button
2. The file will automatically download
3. File name format: `billing_statement_YYYYMMDD_HHMMSS.xlsx`

## API Endpoints

All admin endpoints require authentication header:
```
Authorization: Admin <base64_token>
```

### Authentication
- `POST /api/admin/login` - Admin login
  - Body: `{username, password}`
  - Returns: `{success, token}`

### User Management
- `GET /api/admin/users` - Get all users with IMEIs
- `POST /api/admin/user/<email>/imeis` - Add IMEI to user
  - Body: `{imei}`
- `DELETE /api/admin/user/<email>/imeis/<imei>` - Remove IMEI

### Billing
- `GET /api/admin/billing/config` - Get billing configuration
- `PUT /api/admin/billing/config` - Update billing config
  - Body: `{cost_per_user, currency}`
- `GET /api/admin/billing/calculate` - Calculate monthly billing
- `GET /api/admin/billing/export` - Export to Excel (returns file)

## Data Storage

Currently using in-memory storage:
- `users_db` - User accounts and login info
- `user_imeis` - IMEI tracking per user
-  `billing_config` - Billing settings

**⚠️ Note:** For production use, migrate to a database (PostgreSQL, MySQL, etc.) to persist data across server restarts.

## Security Considerations

### Current Implementation
- Credentials from environment variables (.env file)
- Basic Base64 authentication token
- In-memory session storage

### Production Recommendations
1. **Move credentials to environment variables**
2. **Implement JWT-based admin sessions with expiration**
3. **Add rate limiting to prevent brute force attacks**
4. **Enable HTTPS in production**
5. **Use a proper database with encryption**
6. **Add audit logging for admin actions**
7. **Implement role-based access control (RBAC)**

## Troubleshooting

### Cannot access admin portal
- Ensure Flask server is running
- Check that you're using the correct URL
- Verify no firewall is blocking port 5000

### Excel export fails
- Ensure `openpyxl` is installed: `pip install openpyxl`
- Check server logs for specific error messages

### Users not showing
- Check that users have completed registration through the main app
- Verify backend is properly storing user data
- Use browser dev tools to check API responses

## Maintenance

### Regular Tasks
1. **Export billing reports monthly** for record-keeping
2. **Review and clean up inactive users** if needed
3. **Monitor IMEI assignments** for accuracy
4. **Update billing rates** as needed

### Backup Data
Since current implementation uses in-memory storage, consider:
1. Implementing periodic data exports
2. Migrating to persistent database storage
3. Setting up automated backups

## Future Enhancements

Potential improvements:
- Email reports to stakeholders
- Historical billing trends and analytics
- User activity monitoring
- Bulk IMEI import/export
- Advanced filtering and search
- Custom date range for billing periods
- Multi-admin support with permissions
- Audit trail for all admin actions
