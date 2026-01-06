# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The NXTG-Forge team takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

**security@nxtg.ai** or **axw@nxtg.ai**

Include the following information in your report:

- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### What to Expect

After you submit a report, you should expect:

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.

2. **Initial Assessment**: We will send an initial assessment within 5 business days, including:
   - Confirmation of the vulnerability
   - Severity assessment (Critical, High, Medium, Low)
   - Estimated timeline for a fix

3. **Progress Updates**: We will keep you informed about our progress at least every 7 days.

4. **Resolution**: Once the vulnerability is fixed:
   - We will notify you before the public disclosure
   - We will credit you in the security advisory (unless you prefer to remain anonymous)
   - We will publish a security advisory on GitHub

### Disclosure Policy

- **Coordinated Disclosure**: We follow coordinated disclosure practices
- **Embargo Period**: Typically 90 days from initial report to public disclosure
- **Early Disclosure**: If the vulnerability is being actively exploited, we may disclose earlier

## Security Best Practices

When using NXTG-Forge, follow these security best practices:

### Environment Variables

Never commit sensitive information to version control:

```bash
# .env - Never commit this file!
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret
STRIPE_API_KEY=sk_live_...
```

Ensure `.env` is in your `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

### Dependency Management

Keep dependencies up to date:

```bash
# Check for security vulnerabilities
pip-audit
npm audit

# Update dependencies
pip install --upgrade -r requirements.txt
npm update
```

### Docker Security

When deploying with Docker:

```dockerfile
# Don't run as root
USER appuser

# Use specific versions, not 'latest'
FROM python:3.11-slim

# Scan images for vulnerabilities
# docker scan nxtg-forge:latest
```

### API Security

When building APIs with NXTG-Forge:

- **Authentication**: Always implement proper authentication
- **Rate Limiting**: Prevent abuse with rate limiting
- **Input Validation**: Validate and sanitize all user inputs
- **CORS**: Configure CORS appropriately for your use case
- **HTTPS**: Always use HTTPS in production

### Database Security

- **Parameterized Queries**: Prevent SQL injection
- **Least Privilege**: Use database users with minimal required permissions
- **Encryption**: Encrypt sensitive data at rest
- **Backups**: Maintain secure, encrypted backups

### Secrets Management

Do not hardcode secrets in your code:

```python
# ❌ BAD - Hardcoded secret
API_KEY = "sk_live_1234567890"

# ✅ GOOD - Load from environment
import os
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY environment variable not set")
```

## Known Security Considerations

### MCP Auto-Detection

The MCP auto-detection feature scans project files to identify required services. Be aware:

- It reads configuration files (package.json, requirements.txt, etc.)
- It does not execute code or send data externally
- Review detected MCP servers before enabling them

### Template Generation

Code templates may include placeholder secrets. Always:

- Review generated code before committing
- Replace all placeholder values with real secrets via environment variables
- Never commit files containing real credentials

### Agent System

The agent orchestration system:

- Does not store or transmit sensitive data
- Operates locally on your machine
- Uses Claude API only for AI assistance (standard Claude terms apply)

## Security Updates

Subscribe to security updates:

- Watch this repository for security advisories
- Enable GitHub security alerts for your fork
- Follow [@nxtg_ai](https://twitter.com/nxtg_ai) on Twitter

## Bug Bounty Program

We currently do not have a bug bounty program. However, we deeply appreciate security researchers who report vulnerabilities responsibly and will:

- Acknowledge your contribution publicly (with your permission)
- List you in our Hall of Fame
- Consider future bug bounty programs as the project grows

## Hall of Fame

We thank the following security researchers for responsibly disclosing vulnerabilities:

*No vulnerabilities reported yet - be the first!*

## Contact

For security-related questions or concerns:

- **Email**: security@nxtg.ai
- **Alternative**: axw@nxtg.ai
- **PGP Key**: Available upon request

For general questions, use [GitHub Discussions](https://github.com/nxtg-ai/nxtg-forge/discussions).

---

**Thank you for helping keep NXTG-Forge and our community safe!**
