# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OpenClaw Orchestrator** is a local-first desktop application for orchestrating AI agents and real executions on the user's machine. Built with Tauri (Rust backend) and React (TypeScript frontend).

The app doesn't abstract terminal power — it **domesticates** it. Everything happens for real: real commands, real filesystem, real code, real agents. The app provides **control, visibility, security, and scale**.

### Core Philosophy

> Agents execute. The app remembers, organizes, and protects.

### Main Components

1. **OpenClaw (Agent Runtime)** - Stateless executor that runs commands, manipulates filesystem, calls tools. Receives context, executes, responds, terminates. No memory or history.

2. **Orchestrator App** - The brain. Manages conversation history, orchestrates Runs, controls permissions/policies, provides rich UX, coordinates multiple agents, offers observability.

3. **Jarvis** - Claude-like bot integration with dedicated UX. Can trigger runs, use skills, request human approval. Never executes outside app control.

4. **Runs/Executions** - Everything that executes becomes a Run (command, skill, pipeline, agent-triggered execution). Each has status, logs, duration, artifacts, context.

5. **Skills** - Reusable recipes defining inputs, context, steps, validations, expected output. Can call agents, run commands, compose pipelines.

## Commands

```bash
# Development
pnpm dev           # Desktop development with live reload (Tauri + Vite)
pnpm dev:vite      # Web-only development on localhost:3000

# Building
pnpm build         # Full Tauri desktop build (requires Rust toolchain)
pnpm build:vite    # Frontend bundle only

# Testing & Quality
pnpm test          # Run tests with Vitest
pnpm lint          # ESLint check
pnpm check         # Format and fix all (prettier + eslint --fix)
```

## Tech Stack

- **Frontend**: React 19, TypeScript, TanStack Router (file-based routing), TanStack Query
- **State**: Zustand stores
- **UI**: Tailwind CSS 4, shadcn/ui, Radix UI primitives
- **Backend**: Tauri 2 (Rust), SQLite (rusqlite)
- **Build**: Vite 7, pnpm

## Architecture

### Data Flow

```
UI Components → Custom Hooks → Zustand Stores → Tauri IPC → Rust Backend (SQLite)
```

### Key Directories

- `src/routes/` - File-based routing (TanStack Router auto-generates `routeTree.gen.ts`)
- `src/pages/` - Page components (WorkspacePage, JarvisPage, AgentsBuilderPage, SettingsPage)
- `src/components/` - Feature-organized components (agents/, repos/, jarvis/, workspace/, ui/)
- `src/stores/` - Zustand stores (ui-store, command-store, settings-store)
- `src/hooks/` - Custom hooks for business logic (use-agent-state, use-makima-state)
- `src-tauri/src/` - Rust backend (commands, database, process management, bridge protocol)

### State Management

- **UIStore**: Drawer states, selections, mobile sidebar
- **CommandStore**: Repositories, commands, live executions, queue, history
- **SettingsStore**: Bridge mode (safe/auto), theme, auto-approve settings

### Routing

Routes are defined via files in `src/routes/`. Do not edit `routeTree.gen.ts` directly - it is auto-generated.

### Bridge Protocol

CLI/Agent communication uses NDJSON (newline-delimited JSON):

- Handshake: `hello` → `hello.ack`
- Messages: `log`, `plan`, `action.request`, `action.result`, `approval.requested`, `approval.result`
- Modes: "safe" (manual approval required) and "auto" (immediate execution)

### Execution Modes

- **Safe Mode** - All agent actions require human approval before execution
- **Auto Mode** - Actions execute immediately (based on policies/allowlists)

### UI Approach

Chat-first interface (ChatGPT/Cursor style):

- Streaming responses
- Executions appear as events in chat
- Raw terminal hidden by default
- Each conversation generates trackable Runs
- History lives in app (not in agent)

## Adding New Features

### New Page

1. Create route file in `src/routes/mypage.tsx`
2. Create page component in `src/pages/mypage-page.tsx`
3. Router auto-generates route tree

### New Tauri Command

1. Implement in `src-tauri/src/commands.rs` or a feature module
2. Register in `lib.rs` via `tauri::generate_handler![...]`
3. Call from React: `await invoke('command_name', { args })`

## Code Style

- No semicolons (`semi: false`)
- Single quotes
- Trailing commas
- Tailwind classes auto-sorted by Prettier plugin
- **No transparency in colors** - Never use opacity modifiers like `bg-card/70`, `border-border/50`, `text-foreground/80`. All components must have solid colors without transparency.
- **Badges must have background** - Never use outline-only badges. All badges must have border, background, and text colors. Example: `border-sky-500 bg-sky-600 text-sky-950`.

## Key Type Definitions

- Agent types: `src/components/agents/types.ts`
- Repository/Command types: `src/components/repos/types.ts`
- Jarvis config types: `src/components/jarvis/config-types.ts`
- Rust types: `src-tauri/src/types.rs`

## Documentation

- `BUSINESS_MODEL.md` - Product vision and architecture (Portuguese)
- `docs/agent-executor.md` - Agent architecture and bridge protocols (Portuguese)
- `README.md` - Project setup (Portuguese)
