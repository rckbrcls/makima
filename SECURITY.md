# Security Policy

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Report vulnerabilities privately to:

- Email: TODO

## Supported Versions

| Version | Supported |
| ------- | --------- |
| main    | Yes       |

## Security Considerations

Makima coordinates desktop execution, AI CLI sessions, provider credentials, mobile relay flows, approval requests, push notifications, and Supabase-backed session state.

Review these areas carefully:

- Local command execution owned by the desktop app.
- Human approval before remote or mobile-triggered operations.
- `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` handling.
- Supabase relay functions and service-role access.
- Pairing flows, relay session expiry, and approval tokens.
- Logs that may include commands, repository paths, or model outputs.
- Mobile access boundaries and revocation behavior.

## Secrets

Never commit real secrets. Use `.env.example` as a template and prefer local provider configuration where supported.
