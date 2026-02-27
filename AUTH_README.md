# BLE Tag Tracker - Authentication System

## Overview

A secure, passwordless authentication system using email-based PIN verification and JWT tokens.

## Features

✅ **Passwordless Authentication** - No passwords to remember  
✅ **Email PIN Verification** - 6-digit code sent to email  
✅ **JWT Tokens** - Secure, stateless authentication (30-day expiry)  
✅ **New User Flow** - "Get Started" for first-time users  
✅ **Returning User Flow** - "Sign In" for existing users  
✅ **Auto PIN Expiry** - PINs expire after 10 minutes  
✅ **Rate Limiting** - Max 5 PIN verification attempts  
✅ **Responsive Design** - Works on desktop and mobile  

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**For Development (PINs printed to console):**
```env
SECRET_KEY=your-super-secret-key-here
DEBUG=True

# Leave email settings empty for dev mode
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=
EMAIL_PASSWORD=
EMAIL_FROM=
```

**For Production (Send real emails):**
```env
SECRET_KEY=your-super-secret-key-here
DEBUG=False

# Gmail example
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

> **Note:** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

### 3. Run the Server

```bash
python app.py
```

Server starts at: `http://localhost:5000`

---

## User Flows

### New User Flow (Get Started)

1. User clicks **"Get Started"**
2. Enters email address
3. Receives 6-digit PIN via email (or console in dev mode)
4. Enters PIN
5. Gets JWT token and redirects to app

### Returning User Flow (Sign In)

1. User clicks **"Sign In"**
2. Enters email address
3. Receives 6-digit PIN
4. Enters PIN
5. Gets JWT token and redirects to app

---

## API Endpoints

### Authentication Endpoints

#### 1. Send PIN
**POST** `/api/auth/send-pin`

**Request:**
```json
{
  "email": "user@example.com",
  "isNewUser": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

---

#### 2. Verify PIN
**POST** `/api/auth/verify-pin`

**Request:**
```json
{
  "email": "user@example.com",
  "pin": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "user@example.com"
  }
}
```

---

#### 3. Verify Token
**GET** `/api/auth/verify-token`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "email": "user@example.com"
}
```

---

#### 4. Logout
**POST** `/api/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Frontend Integration

### Check Authentication

All protected pages include an auth check:

```javascript
const token = localStorage.getItem('authToken');
if (!token) {
    window.location.href = 'login.html';
}
```

### Making Authenticated API Calls

```javascript
const token = localStorage.getItem('authToken');

fetch('/api/some-protected-route', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(response => response.json())
.then(data => console.log(data));
```

### Logout

```javascript
const token = localStorage.getItem('authToken');

await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

localStorage.removeItem('authToken');
localStorage.removeItem('userEmail');
window.location.href = 'login.html';
```

---

## Email Configuration

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an [App Password](https://support.google.com/accounts/answer/185833)
3. Use the app password in `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

### Other Email Providers

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USERNAME=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

**AWS SES:**
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USERNAME=your-ses-smtp-username
EMAIL_PASSWORD=your-ses-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

---

## Security Best Practices

### ✅ Current Implementation

- JWT tokens with 30-day expiry
- PINs expire after 10 minutes
- Max 5 PIN verification attempts
- Email validation
- Secure token storage (localStorage)

### 🔒 Production Recommendations

1. **Use HTTPS** - Always serve over SSL/TLS
2. **Strong Secret Key** - Use a random, long secret key
3. **Database Storage** - Replace in-memory storage with PostgreSQL/MongoDB:
   ```python
   # Instead of:
   pin_storage = {}
   users_db = {}
   
   # Use:
   # Database queries with SQLAlchemy or MongoDB
   ```
4. **Rate Limiting** - Add Flask-Limiter for API rate limiting
5. **CORS Configuration** - Restrict origins in production:
   ```python
   CORS(app, resources={r"/api/*": {"origins": "https://yourdomain.com"}})
   ```
6. **httpOnly Cookies** - Consider using httpOnly cookies instead of localStorage for tokens

---

## Development Mode

In development mode (when `EMAIL_USERNAME` is not set):

- PINs are printed to the console
- No emails are sent
- Perfect for local testing

**Example console output:**
```
============================================================
📧 EMAIL PIN for user@example.com: 123456
============================================================
```

---

## Troubleshooting

### PIN Not Received

1. **Check spam folder**
2. **Verify email settings in `.env`**
3. **Enable debug mode** to see console PINs:
   ```env
   DEBUG=True
   ```

### Token Invalid/Expired

- Tokens expire after 30 days
- User will be redirected to login automatically

### Email Sending Fails

- Check email credentials
- For Gmail, ensure App Password is used (not regular password)
- Check firewall/network allows SMTP port 587

---

## File Structure

```
bleTags/
├── login.html              # Login page (entry point)
├── index.html              # Main app (protected)
├── backend/
│   ├── app.py             # Flask app with auth endpoints
│   ├── requirements.txt   # Python dependencies
│   ├── .env              # Environment config (create from .env.example)
│   └── .env.example      # Example environment config
└── AUTH_README.md        # This file
```

---

## Next Steps

### For Production Deployment:

1. **Add Database** - PostgreSQL or MongoDB
2. **Email Service** - SendGrid, AWS SES, or Mailgun
3. **Rate Limiting** - Flask-Limiter
4. **Monitoring** - Sentry for error tracking
5. **SSL Certificate** - Let's Encrypt or Cloudflare

### Optional Enhancements:

- [ ] Remember device (skip PIN for 30 days)
- [ ] Email templates customization
- [ ] Multi-factor authentication (TOTP)
- [ ] Social login (Google, GitHub)
- [ ] Password as alternative
- [ ] User profile management

---

## Support

For questions or issues:
1. Check console logs (`DEBUG=True`)
2. Verify `.env` configuration
3. Test with development mode first

---

## License

Part of BLE Tag Tracker project.
