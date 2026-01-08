# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of BranChat seriously. If you discover a security vulnerability, please follow these steps:

### Where to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **GitHub Security Advisories** (Preferred)
   - Navigate to the [Security tab](https://github.com/vmehmeri/branch-chat/security/advisories)
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Email**
   - Send an email to the maintainers through GitHub
   - Include "SECURITY" in the subject line

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours, we will acknowledge receipt of your vulnerability report
- **Status Updates**: We will send updates on our progress every 5-7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days

### Disclosure Policy

- We request that you do not publicly disclose the vulnerability until we have addressed it
- Once a fix is available, we will coordinate with you on the disclosure timeline
- We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Considerations for Users

### API Key Storage

BranChat stores API keys locally on your device:

- **macOS Electron App**: API keys are stored in the system Keychain
- **Web Version**: API keys are stored in browser localStorage

**Important**: Never commit your `.env` file or share your API keys publicly.

### Self-Hosting Warning

**BranChat is designed for local use only.** Do not host BranChat publicly on the internet without:

- Implementing proper authentication
- Adding rate limiting
- Securing API endpoints
- Reviewing the codebase for security vulnerabilities

Public hosting without proper security measures could expose your API keys and user data.

### Data Privacy

- All conversations are stored locally on your device
- No data is sent to BranChat servers (we don't have any)
- API calls are made directly from your device to AI provider APIs
- Review each AI provider's privacy policy for how they handle your data

### Electron App Security

The Electron app includes the following security measures:

- Context isolation enabled
- Node integration disabled in renderer
- Content Security Policy (CSP) configured
- IPC communication restricted to specific channels

## Security Best Practices for Contributors

When contributing to BranChat, please:

1. **Never commit secrets**: Use `.env.example` for templates only
2. **Validate user input**: Sanitize all user-provided data
3. **Keep dependencies updated**: Regularly update npm packages
4. **Follow OWASP guidelines**: Be aware of common vulnerabilities (XSS, injection, etc.)
5. **Review security implications**: Consider security impact of code changes

## Vulnerability Disclosure

Past security vulnerabilities will be listed here once they have been resolved and disclosed:

- No vulnerabilities have been reported yet

---

Thank you for helping keep BranChat and its users safe!
