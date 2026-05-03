# Architecture

## Overview

Makima is a desktop/mobile orchestration workspace for AI coding sessions. The desktop app owns local execution and provider configuration, the mobile app acts as a companion control surface, and Supabase provides relay/auth/session infrastructure for cross-device coordination.

## Goals

- Keep command execution local to the desktop environment.
- Make AI coding sessions observable and resumable.
- Require human approval for sensitive actions.
- Allow mobile review and messaging without bypassing desktop control.
- Keep relay infrastructure narrow and explicit.

## System Components

### Desktop App

`makima-desktop/` owns local repositories, terminal sessions, AI CLI integration, provider configuration, session state, logs, and approval handling.

### Mobile App

`makima-mobile/` provides companion access for pairing, chat, session status, and approval review.

### Supabase

`supabase/` contains database, relay, auth, and edge-function support for pairing and mobile coordination.

## Data Flow

1. A desktop session starts or resumes a local AI coding workflow.
2. Pairing/relay state is stored through Supabase.
3. The mobile app can inspect session state and submit messages or approvals.
4. Desktop remains responsible for executing commands and applying approvals.

## Security Model

- Provider API keys must stay local or in explicitly configured secure storage.
- Supabase service-role keys belong only in trusted server/edge contexts.
- Mobile-triggered behavior should pass through approval boundaries.
- Logs may contain repository paths, command output, and model output, so they should be treated as sensitive.

## Trade-offs

- Supabase relay makes mobile coordination simpler, but introduces external infrastructure that must be secured.
- Desktop-owned execution protects local machine boundaries, but requires careful approval and session-state design.
- Supporting multiple AI providers improves flexibility, but increases configuration and secret-management complexity.

## Future Improvements

- Document pairing expiry and revocation behavior in detail.
- Add screenshots for desktop and mobile approval flows.
- Add a threat model for relay, approval, and local command execution.
