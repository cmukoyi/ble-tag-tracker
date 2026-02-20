# Security Policy

## 🔐 Credential Security

**IMPORTANT:** This repository uses environment variables for all sensitive credentials.

### ✅ DO

- Store credentials in `backend/.env` (never committed to git)
- Use `backend/.env.example` as a template
- Set environment variables:
  - `OAUTH_USERNAME` (NOT `USERNAME`)
  - `OAUTH_PASSWORD` (NOT `PASSWORD`)
  - `CLIENT_SECRET`
  - `CLIENT_ID`

### ❌ DO NOT

- **NEVER** hardcode credentials in `.py`, `.js`, or `.html` files
- **NEVER** commit `.env` files
- **NEVER** create scripts with embedded credentials
- **NEVER** commit token files or credential JSON files

## 🚨 If Credentials Are Exposed

If credentials are accidentally pushed to the repository:

1. **Immediately** rotate the exposed credentials at the OAuth provider
2. Remove the file from git: `git rm --cached FILENAME`
3. Add the file to `.gitignore`
4. Commit the removal
5. Consider using `git filter-repo` to remove from history (advanced)

## 📝 Safe Development Practices

### Environment Setup

```bash
# 1. Copy template
cp backend/.env.example backend/.env

# 2. Edit with your credentials
nano backend/.env

# 3. Verify .gitignore covers .env
git check-ignore backend/.env  # Should return: backend/.env
```

### Pre-Commit Checklist

Before every commit, verify:

```bash
# Check what's being committed
git status

# Ensure no .env files
git ls-files | grep -E "\.env$|credentials|secrets|token"

# Should return nothing - if it returns files, DON'T COMMIT!
```

## 🛡️ Protected Files (.gitignore)

These patterns are automatically excluded:

- `*.env` - All environment files
- `get_token.py` - Scripts with embedded credentials
- `*_credentials.py` - Credential scripts
- `*_secrets.py` - Secret files
- `token.txt` - Token files
- `credentials.json` - Credential JSON
- `secrets.json` - Secret JSON

## 📧 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email the repository owner directly
3. Provide details about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## 🔄 Credential Rotation Schedule

Recommended rotation schedule for production environments:

- **OAuth Client Secrets**: Every 90 days
- **User Passwords**: Every 60 days
- **API Keys**: Every 90 days

## ✅ Security Verification

Run these commands to verify your setup is secure:

```bash
# 1. Check .env is ignored
git check-ignore backend/.env

# 2. Verify no credentials in tracked files
git grep -i "password.*=.*[A-Z]" -- "*.py" "*.js"  # Should return nothing

# 3. Check .gitignore is effective
cat .gitignore | grep "\.env"  # Should show .env patterns
```

## 📚 Additional Resources

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- [Rotating OAuth Credentials](https://oauth.net/2/)

---

**Remember:** When in doubt, DO NOT commit. Ask first!
