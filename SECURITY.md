# WorkLink v2 Security Guide

## 🔐 API Key Management

### ⚠️ NEVER commit API keys to version control

The following files should NEVER contain real API keys:
- Source code files
- Documentation
- README files
- Docker files (unless using build secrets)

### ✅ Secure Key Storage

**For Development:**
1. Copy `.env.example` to `.env`
2. Fill in your development API keys
3. `.env` is already in `.gitignore` - keep it that way!

**For Production:**
- Use Railway environment variables
- Use AWS Secrets Manager / HashiCorp Vault
- Never store in plain text files

### 🔑 Where to Get API Keys

| Service | Where to Get | Format |
|---------|-------------|--------|
| **Anthropic Claude** | https://console.anthropic.com/ | `sk-ant-api03-...` |
| **Telegram Bot** | @BotFather on Telegram | `123456789:ABC...` |
| **Google APIs** | https://console.cloud.google.com/ | `AIza...` |
| **VAPID Keys** | `npx web-push generate-vapid-keys` | Public/Private pair |

### 🚨 If Keys Are Exposed

**IMMEDIATE ACTIONS:**
1. **Revoke exposed keys** at provider console
2. **Generate new keys**
3. **Update environment variables**
4. **Check git history** for exposed keys
5. **Remove from git history** if found:
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch .env' \
   --prune-empty --tag-name-filter cat -- --all
   ```

### 🔒 Environment Variable Security

**Required Environment Variables:**
- `ANTHROPIC_API_KEY` - Claude AI API access
- `TELEGRAM_BOT_TOKEN` - Bot messaging
- `GOOGLE_API_KEY` - Location services
- `VAPID_PUBLIC_KEY` - Push notifications
- `VAPID_PRIVATE_KEY` - Push notifications
- `VAPID_EMAIL` - Push notification contact

**Development vs Production:**
```bash
# Development - use .env file
NODE_ENV=development

# Production - use platform environment variables
NODE_ENV=production
```

### 🛡️ Security Headers

The application enforces:
- CORS origin restrictions
- Content Security Policy (when enabled)
- Rate limiting on auth endpoints
- Input validation on all endpoints

### 🔍 Security Checklist

- [ ] `.env` file exists and has all required keys
- [ ] `.env` is in `.gitignore`
- [ ] No API keys in source code
- [ ] API keys follow correct format
- [ ] Production uses environment variables, not files
- [ ] Keys are rotated regularly (monthly)
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced in production

### 🚨 Reporting Security Issues

If you discover a security vulnerability:
1. **Do NOT create a public issue**
2. Email security concerns to the development team
3. Include steps to reproduce
4. Allow time for fix before disclosure

---

**Remember: Security is everyone's responsibility! 🔐**