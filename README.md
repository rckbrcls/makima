# Makima

> **Status:** Active
> This project is currently maintained as a desktop/mobile orchestration workspace for AI coding sessions.

Desktop and mobile orchestration workspace for AI coding sessions. Makima pairs a local desktop app with an iOS companion and a Supabase relay so commands, agent conversations, approvals, and session state can be controlled across devices.

## Summary

- Desktop/mobile orchestration workspace for AI coding sessions.
- Solves local execution control, terminal/CLI session visibility, provider configuration, approvals, mobile pairing, and Supabase relay across devices.
- Main stack: Tauri + React desktop app, native iOS companion, Supabase migrations/relay tables, local storage, terminal session management, and provider integrations.
- Current status: active workspace with desktop runtime, mobile companion, and relay split.
- Technical value: keeps mobile control permissioned through desktop-owned execution instead of bypassing local policies.

## Overview

Makima is a control layer for real development work. The desktop app owns local execution, terminal sessions, repositories, providers, and AI CLI integration. The mobile app is a companion interface for chat, approvals, pairing, status, and remote control through a Supabase-backed relay.

The product direction is not "hide the terminal." It is to make real terminal and agent execution observable, resumable, permissioned, and easier to coordinate.

## Motivation

- Manage multiple AI CLI sessions from a richer desktop UI.
- Keep command execution, logs, approvals, and resume IDs visible.
- Support provider configuration for local and hosted model providers.
- Pair a mobile device to a desktop session through short-lived relay sessions.
- Let mobile users review approval requests and send messages without bypassing desktop control.
- Preserve a local-first desktop stance while using Supabase only for relay/auth/mobile sync needs.

## Features

- `makima-desktop`: Tauri + React desktop app with chat, code sessions, CLI detection, terminal pool behavior, providers, repositories, and local storage.
- `makima-mobile`: native iOS app with chat UI, approvals, pairing, notification support, conversations, settings, and relay services.
- `supabase`: relay schema for sessions, messages, devices, realtime, and push notification trigger support.
- `docs`: business and product notes.

## Project Structure

```text
makima/
├── makima-desktop/
│   ├── src/        # React app, routes, stores, hooks, terminal/session logic
│   └── src-tauri/  # Tauri shell and Rust-side desktop capabilities
├── makima-mobile/
│   ├── makima-mobile/       # SwiftUI app, models, services, views, view models
│   ├── makima-mobileTests/  # Unit tests
│   └── makima-mobileUITests/
├── supabase/
│   └── migrations/          # Relay sessions, messages, devices, and push trigger
├── docs/
├── CLAUDE.md
└── todo.md
```

## Current Status

The active repository shape is broader than an older single-desktop README implied. The important split is desktop runtime, mobile companion, and Supabase relay. `CLAUDE.md` contains detailed engineering notes for the desktop orchestrator and should be checked before changing state management, CLI session lifecycle, terminal pooling, or execution behavior.

## Known Limitations

- Do not let the mobile app execute outside desktop-controlled policies.
- Treat `relay_sessions`, `relay_messages`, and `relay_devices` as the cross-device contract.
- Keep the desktop app responsible for local execution and session ownership.
- Avoid running build or dev commands from agent sessions in this workspace.
