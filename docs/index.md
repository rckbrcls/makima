# Documentation

Welcome to the documentation for Makima.

## Guides

- [Architecture](architecture.md)
- [Getting Started](getting-started.md)
- [Troubleshooting](troubleshooting.md)
- [Business Model](BUSINESS_MODEL.md)

## Project Surfaces

- `makima-desktop/`: local desktop app that owns execution, terminal/session control, provider configuration, and approvals.
- `makima-mobile/`: iOS companion for chat, approvals, pairing, and remote session awareness.
- `supabase/`: relay, auth, database, and edge-function support for cross-device coordination.

## Notes

- Keep local execution owned by the desktop app.
- Treat mobile and relay flows as approval/control surfaces, not as unrestricted execution channels.
- Update `.env.example` when provider or relay configuration changes.
